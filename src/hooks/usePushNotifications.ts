/** Compatibility seam for staged legacy action hooks. Push is now produced from
 * committed server events; callers cannot choose a recipient or message body. */
export type NotificationType = 'ruleBroken' | 'taskCompleted' | 'rewardPurchased' | 'rewardRedeemed' | 'rewardRefunded' | 'punishmentPerformed' | 'wellnessUpdated' | 'wellnessCheckin' | 'messages' | 'test';
interface SendNotificationParams { targetUserId: string; type: NotificationType; title: string; body: string; data?: Record<string, unknown> }
const notClientDelivered = async (..._arguments: unknown[]): Promise<boolean> => false;
export const usePushNotifications = () => ({
  sendNotification: (_parameters: SendNotificationParams) => notClientDelivered(),
  sendRuleBrokenNotification: (_target: string, _rule: string) => notClientDelivered(),
  sendTaskCompletedNotification: (_target: string, _task: string, _points: number) => notClientDelivered(),
  sendRewardPurchasedNotification: (_target: string, _reward: string, _cost: number) => notClientDelivered(),
  sendRewardRedeemedNotification: (_target: string, _reward: string) => notClientDelivered(),
  sendPunishmentPerformedNotification: (_target: string, _punishment: string, _points: number) => notClientDelivered(),
  sendWellnessUpdatedNotification: (_target: string, _score: number) => notClientDelivered(),
  sendWellnessCheckinNotification: (_target: string) => notClientDelivered(),
  sendMessageNotification: (_target: string, _sender: string, _preview: string) => notClientDelivered(),
});
