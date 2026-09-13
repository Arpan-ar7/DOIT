import { ChatMessage } from '../lib/apiClient';
import { DeliveryRequest } from '../constants/mockData';

export type Conversation = {
  request: DeliveryRequest;
  lastMessage?: ChatMessage;
  unread: boolean;
};

// CHANGED — currentUserId is now passed in explicitly instead of imported
// from mock data, since it has to be the REAL logged-in user's Supabase id.
export function getConversations(
  requests: DeliveryRequest[],
  messagesByRequest: Record<string, ChatMessage[]>,
  readStatus: Record<string, number>,
  currentUserId: string,
): Conversation[] {
  return requests
    .filter((r) => r.status !== 'pending' && r.accepterId === currentUserId)
    .map((r) => {
      const messages = messagesByRequest[r.id] ?? [];
      const lastMessage = messages[messages.length - 1];
      const unread = !!lastMessage && lastMessage.sender_id !== currentUserId && new Date(lastMessage.created_at).getTime() > (readStatus[r.id] ?? 0);
      return { request: r, lastMessage, unread };
    })
    .sort((a, b) => (b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0) - (a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0));
}

export function getUnreadCount(conversations: Conversation[]) {
  return conversations.filter((c) => c.unread).length;
}