import { logger } from '@/lib/logger';

export type NotificationType = 'ruleBroken' | 'taskCompleted' | 'rewardPurchased' | 'rewardRedeemed' | 'punishmentPerformed' | 'wellnessUpdated' | 'wellnessCheckin' | 'messages';

export interface QueuedNotification {
  targetUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
}

export interface BatchedNotificationData {
  count: number;
  items: string[];
  totalPoints?: number;
  firstItem: string;
}

class NotificationQueueManager {
  private queues = new Map<string, QueuedNotification[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private lastSentTimes = new Map<string, number>();
  
  private readonly BATCH_WINDOW_MS = 5000; // 5 seconds
  private readonly RATE_LIMIT_MS = 10000; // 10 seconds
  private readonly CRITICAL_TYPES: NotificationType[] = ['ruleBroken', 'wellnessCheckin'];

  private getQueueKey(targetUserId: string, type: NotificationType): string {
    return `${targetUserId}:${type}`;
  }

  private getRateLimitKey(targetUserId: string, type: NotificationType): string {
    return `${targetUserId}:${type}:rate`;
  }

  private isRateLimited(targetUserId: string, type: NotificationType): boolean {
    const key = this.getRateLimitKey(targetUserId, type);
    const lastSent = this.lastSentTimes.get(key) || 0;
    const now = Date.now();
    return (now - lastSent) < this.RATE_LIMIT_MS;
  }

  private updateRateLimit(targetUserId: string, type: NotificationType): void {
    const key = this.getRateLimitKey(targetUserId, type);
    this.lastSentTimes.set(key, Date.now());
  }

  private createBatchedMessage(notifications: QueuedNotification[]): { title: string; body: string; data: Record<string, any> } {
    if (notifications.length === 1) {
      const notif = notifications[0];
      return {
        title: notif.title,
        body: notif.body,
        data: notif.data || {}
      };
    }

    const type = notifications[0].type;
    const count = notifications.length;
    
    // Extract data for batching
    const items = notifications.map(n => {
      const data = n.data || {};
      return data.taskName || data.rewardName || data.punishmentName || 'item';
    });
    
    const totalPoints = notifications.reduce((sum, n) => {
      const data = n.data || {};
      const points = data.points || data.cost || 0;
      return sum + Math.abs(points);
    }, 0);

    // Create batched messages based on type
    switch (type) {
      case 'taskCompleted':
        return {
          title: 'Tasks Completed',
          body: count === 2 
            ? `2 tasks completed: ${items[0]}, ${items[1]} (+${totalPoints} points)`
            : `${count} tasks completed (+${totalPoints} points total)`,
          data: { 
            type: 'tasks_completed_batch', 
            count, 
            items: items.slice(0, 3), // Limit for notification size
            totalPoints 
          }
        };
        
      case 'rewardPurchased':
        return {
          title: 'Rewards Purchased',
          body: count === 2
            ? `2 rewards purchased: ${items[0]}, ${items[1]} (-${totalPoints} points)`
            : `${count} rewards purchased (-${totalPoints} points total)`,
          data: { 
            type: 'rewards_purchased_batch', 
            count, 
            items: items.slice(0, 3),
            totalPoints 
          }
        };
        
      case 'rewardRedeemed':
        return {
          title: 'Rewards Redeemed',
          body: count === 2
            ? `2 rewards redeemed: ${items[0]}, ${items[1]}`
            : `${count} rewards redeemed`,
          data: { 
            type: 'rewards_redeemed_batch', 
            count, 
            items: items.slice(0, 3)
          }
        };
        
      case 'punishmentPerformed':
        return {
          title: 'Punishments Applied',
          body: count === 2
            ? `2 punishments applied: ${items[0]}, ${items[1]} (-${totalPoints} points)`
            : `${count} punishments applied (-${totalPoints} points total)`,
          data: { 
            type: 'punishments_performed_batch', 
            count, 
            items: items.slice(0, 3),
            totalPoints 
          }
        };

      case 'messages':
        return {
          title: 'New Messages',
          body: count === 2
            ? `2 new messages`
            : `${count} new messages`,
          data: { 
            type: 'messages_batch', 
            count
          }
        };
        
      default:
        return {
          title: 'Multiple Notifications',
          body: `${count} notifications received`,
          data: { type: 'batch', count }
        };
    }
  }

  queueNotification(notification: QueuedNotification, sendImmediately: (notif: QueuedNotification) => Promise<boolean>): void {
    const { targetUserId, type } = notification;
    
    // Critical notifications always send immediately
    if (this.CRITICAL_TYPES.includes(type)) {
      logger.debug(`[NotificationQueue] Sending critical notification immediately: ${type}`);
      sendImmediately(notification);
      this.updateRateLimit(targetUserId, type);
      return;
    }

    // Check rate limiting
    if (this.isRateLimited(targetUserId, type)) {
      logger.debug(`[NotificationQueue] Rate limited, skipping notification: ${type} for user ${targetUserId}`);
      return;
    }

    const queueKey = this.getQueueKey(targetUserId, type);
    const currentQueue = this.queues.get(queueKey) || [];
    
    // First notification of this type - send immediately and start batching window
    if (currentQueue.length === 0) {
      logger.debug(`[NotificationQueue] First notification, sending immediately: ${type}`);
      sendImmediately(notification);
      this.updateRateLimit(targetUserId, type);
      
      // Start the batching window for subsequent notifications
      this.queues.set(queueKey, [notification]);
      
      const timer = setTimeout(() => {
        this.processBatch(queueKey, sendImmediately);
      }, this.BATCH_WINDOW_MS);
      
      this.timers.set(queueKey, timer);
    } else {
      // Add to existing queue for batching
      logger.debug(`[NotificationQueue] Adding to batch queue: ${type}, queue size: ${currentQueue.length + 1}`);
      currentQueue.push(notification);
      this.queues.set(queueKey, currentQueue);
    }
  }

  private processBatch(queueKey: string, sendImmediately: (notif: QueuedNotification) => Promise<boolean>): void {
    const queue = this.queues.get(queueKey);
    const timer = this.timers.get(queueKey);
    
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(queueKey);
    }
    
    if (!queue || queue.length <= 1) {
      // No additional notifications to batch, just clean up
      this.queues.delete(queueKey);
      return;
    }

    // Get notifications added after the first one (which was already sent)
    const notificationsToProcess = queue.slice(1);
    
    if (notificationsToProcess.length === 0) {
      this.queues.delete(queueKey);
      return;
    }

    logger.debug(`[NotificationQueue] Processing batch of ${notificationsToProcess.length} notifications`);
    
    // Create batched notification
    const batchedMessage = this.createBatchedMessage(notificationsToProcess);
    const firstNotification = notificationsToProcess[0];
    
    const batchNotification: QueuedNotification = {
      targetUserId: firstNotification.targetUserId,
      type: firstNotification.type,
      title: batchedMessage.title,
      body: batchedMessage.body,
      data: batchedMessage.data,
      timestamp: Date.now()
    };

    // Send the batched notification
    sendImmediately(batchNotification);
    this.updateRateLimit(firstNotification.targetUserId, firstNotification.type);
    
    // Clean up
    this.queues.delete(queueKey);
  }

  // Method to clear all queues (useful for testing or cleanup)
  clearAllQueues(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.queues.clear();
  }

  // Method to get queue stats (useful for debugging)
  getQueueStats(): { activeQueues: number; pendingNotifications: number } {
    const activeQueues = this.queues.size;
    const pendingNotifications = Array.from(this.queues.values())
      .reduce((total, queue) => total + queue.length, 0);
    
    return { activeQueues, pendingNotifications };
  }
}

// Export singleton instance
export const notificationQueue = new NotificationQueueManager();