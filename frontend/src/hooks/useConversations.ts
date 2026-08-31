import { useCallback, useEffect, useRef, useState } from 'react';
import { DeliveryRequest } from '../constants/mockData';
import { getConversationSummaries, subscribeToMyMessages, MessageRow } from '../lib/messagesApi';

export type Conversation = {
  request: DeliveryRequest;
  lastMessage?: MessageRow;
  unread: boolean;
};

type ConversationSummary = { lastMessage: MessageRow; unreadCount: number };

export const CHAT_BUFFER_MS = 10 * 60 * 1000; // 10 minutes buffer after delivery

// A conversation is listed while the request is actively in progress or
// completed within the 10-minute grace period buffer.
export function isParticipant(r: DeliveryRequest, userId: string, now: number = Date.now()) {
  const isParty = r.requester.id === userId || r.accepterId === userId;
  if (!isParty) return false;

  if (r.status === 'accepted' || r.status === 'in_progress') {
    return true;
  }

  if (r.status === 'completed') {
    const completionTimeStr = r.completedAt || r.updatedAt;
    if (!completionTimeStr) return false;
    const completionTime = new Date(completionTimeStr).getTime();
    if (isNaN(completionTime)) return false;
    return now - completionTime < CHAT_BUFFER_MS;
  }

  return false;
}

export function useConversations(requests: DeliveryRequest[], userId: string) {
  const [summaries, setSummaries] = useState<Record<string, ConversationSummary>>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  // Periodic ticker so completed requests automatically expire from list after 10 mins
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const myRequests = requests.filter((r) => isParticipant(r, userId, now));
  const myRequestIds = myRequests.map((r) => r.id).join(',');

  const refresh = useCallback(async () => {
    const ids = requestsRef.current.filter((r) => isParticipant(r, userId, Date.now())).map((r) => r.id);
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

  // Zero out local unread for a request the moment the user opens the chat
  const clearUnread = useCallback((requestId: string) => {
    setSummaries((prev) => {
      const existing = prev[requestId];
      if (!existing || existing.unreadCount === 0) return prev;
      return { ...prev, [requestId]: { ...existing, unreadCount: 0 } };
    });
  }, []);

  return { conversations, unreadCount, loading, refresh, clearUnread };
}