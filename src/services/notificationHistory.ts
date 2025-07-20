export interface NotificationHistoryItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
  deepLinkUrl?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  url?: string;
}

class NotificationHistoryManager {
  private history: NotificationHistoryItem[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('notification-history');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('notification-history', JSON.stringify(this.history));
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }

  public addNotification(notification: Omit<NotificationHistoryItem, 'id' | 'timestamp' | 'read'>) {
    const item: NotificationHistoryItem = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      read: false,
      deepLinkUrl: this.generateDeepLink(notification.type, notification.data)
    };

    this.history.unshift(item);

    // Keep only the most recent notifications
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    this.saveToStorage();
    return item;
  }

  private generateDeepLink(type: string, data?: Record<string, any>): string {
    switch (type) {
      case 'taskCompleted':
        return '/tasks';
      case 'rewardPurchased':
      case 'rewardRedeemed':
        return '/rewards';
      case 'punishmentPerformed':
        return '/punishments';
      case 'ruleBroken':
        return '/rules';
      case 'wellnessUpdated':
      case 'wellnessCheckin':
        return '/wellbeing';
      case 'messages':
        return '/messages';
      default:
        return '/';
    }
  }

  public getHistory(): NotificationHistoryItem[] {
    return [...this.history];
  }

  public getUnreadCount(): number {
    return this.history.filter(item => !item.read).length;
  }

  public markAsRead(id: string) {
    const item = this.history.find(h => h.id === id);
    if (item) {
      item.read = true;
      this.saveToStorage();
    }
  }

  public markAllAsRead() {
    this.history.forEach(item => item.read = true);
    this.saveToStorage();
  }

  public deleteNotification(id: string) {
    this.history = this.history.filter(h => h.id !== id);
    this.saveToStorage();
  }

  public clearHistory() {
    this.history = [];
    this.saveToStorage();
  }

  public getNotificationActions(notification: NotificationHistoryItem): NotificationAction[] {
    const actions: NotificationAction[] = [];

    switch (notification.type) {
      case 'taskCompleted':
        actions.push({ id: 'view-tasks', label: 'View Tasks', action: 'navigate', url: '/tasks' });
        break;
      case 'rewardPurchased':
      case 'rewardRedeemed':
        actions.push({ id: 'view-rewards', label: 'View Rewards', action: 'navigate', url: '/rewards' });
        break;
      case 'punishmentPerformed':
        actions.push({ id: 'view-punishments', label: 'View Punishments', action: 'navigate', url: '/punishments' });
        break;
      case 'ruleBroken':
        actions.push({ id: 'view-rules', label: 'View Rules', action: 'navigate', url: '/rules' });
        break;
      case 'wellnessUpdated':
      case 'wellnessCheckin':
        actions.push({ id: 'view-wellbeing', label: 'View Wellbeing', action: 'navigate', url: '/wellbeing' });
        break;
      case 'messages':
        actions.push({ id: 'view-messages', label: 'View Messages', action: 'navigate', url: '/messages' });
        break;
    }

    return actions;
  }
}

// Singleton instance
export const notificationHistory = new NotificationHistoryManager();

export const useNotificationHistory = () => {
  return {
    addNotification: (notification: Omit<NotificationHistoryItem, 'id' | 'timestamp' | 'read'>) =>
      notificationHistory.addNotification(notification),
    getHistory: () => notificationHistory.getHistory(),
    getUnreadCount: () => notificationHistory.getUnreadCount(),
    markAsRead: (id: string) => notificationHistory.markAsRead(id),
    markAllAsRead: () => notificationHistory.markAllAsRead(),
    deleteNotification: (id: string) => notificationHistory.deleteNotification(id),
    clearHistory: () => notificationHistory.clearHistory(),
    getActions: (notification: NotificationHistoryItem) =>
      notificationHistory.getNotificationActions(notification)
  };
};
