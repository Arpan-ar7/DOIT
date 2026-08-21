import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { formatClockTime } from '../../utils/time';
import { getMessages, sendMessage, subscribeToMessages, markMessagesRead, MessageRow } from '../../lib/messagesApi';
import Avatar from '../../components/Avatar';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRequestById } = useRequests();
  const { user } = useAuth();
  const request = getRequestById(id);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Chat only opens once the request is accepted — matches
  // messages_insert_participant RLS (status must be accepted/in_progress).
  // 'completed' is read-only: the select policy stops returning rows past
  // that point, so we treat it as ended rather than trying to load history.
  const chatOpen = request?.status === 'accepted' || request?.status === 'in_progress';
  const chatEnded = request?.status === 'completed';

  const other = request
    ? user?.id === request.requester.id
      ? { name: request.accepter?.name ?? 'Deliverer', initials: request.accepter?.initials ?? '?' }
      : { name: request.requester.name, initials: request.requester.initials }
    : null;

  useEffect(() => {
    if (!request || !chatOpen || !user) return;
    let cancelled = false;

    setLoading(true);
    getMessages(request.id)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    markMessagesRead(request.id, user.id).catch(() => {});

    const unsubscribe = subscribeToMessages(request.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_id !== user.id) {
        markMessagesRead(request.id, user.id).catch(() => {});
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [request?.id, chatOpen, user?.id]);

  async function handleSend() {
    const content = text.trim();
    if (!content || !request || !user || sending) return;
    setText('');
    setSending(true);
    try {
      // Optimistic bubble — the realtime INSERT event for our own message
      // still arrives, but the id-dedupe above absorbs it once it does.
      const optimistic: MessageRow = {
        id: `pending-${Date.now()}`,
        request_id: request.id,
        sender_id: user.id,
        content,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

      const saved = await sendMessage(request.id, user.id, content);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    } catch (e) {
      // Send failed (offline / RLS) — drop the optimistic bubble and give
      // the text back so nothing is silently lost.
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('pending-')));
      setText(content);
    } finally {
      setSending(false);
    }
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>This conversation no longer exists.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <View style={styles.person}>
            <Avatar initials={other?.initials ?? '?'} backgroundColor="#d4e8f8" textColor="#236b95" />
            <View>
              <Text style={styles.personName}>{other?.name}</Text>
            </View>
          </View>
        </View>

        {!chatOpen && !chatEnded && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Chat opens once this request is accepted.</Text>
          </View>
        )}

        {chatEnded && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>This request is completed — the conversation has ended.</Text>
          </View>
        )}

        {chatOpen && (
          <>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.green} />
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={styles.chatArea}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              >
                {messages.length === 0 && (
                  <Text style={styles.date}>Say hi to get started</Text>
                )}
                {messages.map((m) => {
                  const fromMe = m.sender_id === user?.id;
                  return (
                    <View key={m.id} style={[styles.bubble, fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                      <Text style={fromMe ? styles.bubbleTextMe : styles.bubbleTextThem}>{m.content}</Text>
                      <Text style={styles.bubbleTime}>{formatClockTime(new Date(m.created_at))}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder={`Message ${other?.name?.split(' ')[0] ?? ''}...`}
                value={text}
                onChangeText={setText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                editable={!sending}
              />
              <Pressable style={styles.sendBtn} onPress={handleSend} disabled={sending}>
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.cream,
  },
  iconBtn: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  personName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  chatArea: { padding: spacing.xl, gap: 10, flexGrow: 1 },
  date: { textAlign: 'center', color: colors.muted, fontSize: 11, marginBottom: 8 },
  bubble: { maxWidth: '78%', paddingVertical: 11, paddingHorizontal: 13, borderRadius: 15 },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 5,
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.mint, borderBottomRightRadius: 5 },
  bubbleTextThem: { fontSize: 13, lineHeight: 18, color: colors.ink },
  bubbleTextMe: { fontSize: 13, lineHeight: 18, color: '#174e3e' },
  bubbleTime: { fontSize: 9, opacity: 0.58, textAlign: 'right', marginTop: 4, color: colors.ink },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e7e0',
    backgroundColor: '#fafbf8',
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontSize: 14,
  },
  sendBtn: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
