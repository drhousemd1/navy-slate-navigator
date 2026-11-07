/** Sender presence cannot establish recipient presence. Native committed message
 * events produce notifications on the server; retained legacy callers send none. */
export const useSmartMessageNotifications = () => ({
  shouldSendNotification: (_receiverId: string) => false,
  sendNewMessageNotification: async (_receiverId: string, _senderName: string, _messageContent: string): Promise<boolean> => false,
});
