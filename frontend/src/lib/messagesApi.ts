import { supabase } from './supabase';

// Talks directly to Supabase (not the Express backend) — the `messages`
// table has its own RLS (participant + request-status scoped, see schema),
// and Realtime gives us live push for free. No backend endpoint exists for
// this and none is needed.

export type MessageRow = {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
};

export async function getMessages(requestId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(requestId: string, senderId: string, content: string): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ request_id: requestId, sender_id: senderId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Marks the OTHER participant's messages as read (never your own).
export async function markMessagesRead(requestId: string, myUserId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('request_id', requestId)
    .neq('sender_id', myUserId)
    .eq('is_read', false);
  if (error) throw error;
}

// Live updates for ONE conversation screen. Filtering server-side by
// request_id keeps the payload tiny.
export function subscribeToMessages(requestId: string, onInsert: (msg: MessageRow) => void) {
  // Unique per call — two screens subscribing to the same request_id would
  // otherwise collide on the channel name (see subscribeToMyMessages below).
  const channel = supabase
    .channel(`messages:${requestId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${requestId}` },
      (payload) => onInsert(payload.new as MessageRow),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// Live updates across ALL of the current user's conversations (used for the
// Messages tab list + the unread badge). No server-side filter is possible
// here (multiple request ids), but Postgres RLS on `messages` still scopes
// what actually arrives over the socket to rows this user is a participant
// in, so we're never receiving anyone else's messages — just filtering
// client-side for "is this one of my open conversations".
export function subscribeToMyMessages(onInsert: (msg: MessageRow) => void) {
  // Both the tab-bar badge and the Messages list screen call this at the
  // same time — each needs its OWN channel. Supabase caches channels by
  // name, so a fixed name here means the second caller gets back the first
  // caller's already-subscribed channel and .on() throws. Random suffix
  // keeps every subscriber independent.
  const channel = supabase
    .channel(`messages:mine:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => onInsert(payload.new as MessageRow),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// One row per request_id: its latest message + how many are unread (sent by
// the other person, not yet marked read). Used to build the conversation
// list without an N+1 query per request.
export async function getConversationSummaries(
  requestIds: string[],
  myUserId: string,
): Promise<Record<string, { lastMessage: MessageRow; unreadCount: number }>> {
  if (requestIds.length === 0) return {};

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .in('request_id', requestIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const summaries: Record<string, { lastMessage: MessageRow; unreadCount: number }> = {};
  for (const row of data ?? []) {
    if (!summaries[row.request_id]) {
      summaries[row.request_id] = { lastMessage: row, unreadCount: 0 };
    }
    if (!row.is_read && row.sender_id !== myUserId) {
      summaries[row.request_id].unreadCount += 1;
    }
  }
  return summaries;
}