import { useCallback, useEffect, useRef, useState } from 'react';
import { DeliveryRequest } from '../constants/mockData';
import { getConversationSummaries, subscribeToMyMessages, MessageRow } from '../lib/messagesApi';

export type Conversation = {
  request: DeliveryRequest;
  lastMessage?: MessageRow;
  unread: boolean;
};

// A conversation is listed only while the request is actively in progress —
// chat opens on accept and closes once completed/cancelled (matches
// messages RLS, which also stops returning rows past completion).
function isParticipant(r: DeliveryRequest, userId: string) {
  const active = r.status === 'accepted' || r.status === 'in_progress';
  return active && (r.requester.id === userId || r.accepterId === userId);
}

export function useConversations(requests: DeliveryRequest[], userId: string) {
  const [summaries, setSummaries] = useState<Record<string, { lastMessage: MessageRow; unreadCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  const myRequests = requests.filter((r) => isParticipant(r, userId));
  const myRequestIds = myRequests.map((r) => r.id).join(',');

  const refresh = useCallback(async () => {
    const ids = requestsRef.current.filter((r) => isParticipant(r, userId)).map((r) => r.id);
    if (!userId || ids.length === 0) {
      setSummaries({});
      setLoading(false);
      return;
    }
    try {
      const data = await getConversationSummaries(ids, userId);
      setSummaries(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh, myRequestIds]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToMyMessages((msg) => {
      const relevant = requestsRef.current.some((r) => r.id === msg.request_id && isParticipant(r, userId));
      if (!relevant) return;
      setSummaries((prev) => ({
        ...prev,
        [msg.request_id]: {
          lastMessage: msg,
          unreadCount:
            msg.sender_id === userId
              ? prev[msg.request_id]?.unreadCount ?? 0
              : (prev[msg.request_id]?.unreadCount ?? 0) + 1,
        },
      }));
    });
  }, [userId]);

  const conversations: Conversation[] = myRequests
    .map((request) => {
      const summary = summaries[request.id];
      return { request, lastMessage: summary?.lastMessage, unread: (summary?.unreadCount ?? 0) > 0 };
    })
    .sort((a, b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bt - at;
    });

  const unreadCount = conversations.filter((c) => c.unread).length;

  return { conversations, unreadCount, loading, refresh };
}