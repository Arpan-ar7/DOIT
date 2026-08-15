import { ChatMessage } from '../context/RequestsContext';
import { DeliveryRequest, CURRENT_USER } from '../constants/mockData';

export type Conversation = {
  request: DeliveryRequest;
  lastMessage?: ChatMessage;
  unread: boolean;
};

export function getConversations(
  requests: DeliveryRequest[],
  messagesByRequest: Record<string, ChatMessage[]>,
  readStatus: Record<string, number>,
): Conversation[] {
  return requests
    .filter((r) => r.status !== 'requested' && r.accepterId === CURRENT_USER.id)
    .map((r) => {
      const messages = messagesByRequest[r.id] ?? [];
      const lastMessage = messages[messages.length - 1];
      const unread = !!lastMessage && !lastMessage.fromMe && lastMessage.createdAt > (readStatus[r.id] ?? 0);
      return { request: r, lastMessage, unread };
    })
    .sort((a, b) => (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0));
}

export function getUnreadCount(conversations: Conversation[]) {
  return conversations.filter((c) => c.unread).length;
}