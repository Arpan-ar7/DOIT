import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, FlatList,
  KeyboardAvoidingView, Platform, Animated, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { horror, radius, spacing } from '../../constants/theme';
import { CRAVING_LABELS } from '../../constants/mockData';
import { useCravings } from '../../context/CravingsContext';
import { useAuth } from '../../context/AuthContext';
import { getMessages, sendMessage as sendRealMessage, subscribeToMessages, markMessagesRead, MessageRow } from '../../lib/messagesApi';

// @ts-ignore
import batImg from '../../assets/horror/bat.jpg';



function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

function getRandomAcceptLabel() {
  const labels = CRAVING_LABELS.accept;
  return labels[Math.floor(Math.random() * labels.length)];
}

export default function CravingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getCravingById, acceptCraving, markAsDelivered } = useCravings();

  const craving = getCravingById(id ?? '');
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [msgText, setMsgText] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const acceptLabel = useRef(getRandomAcceptLabel()).current;

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const isOwn = craving?.postedBy.id === user?.id;
  const isAccepter = craving?.acceptedBy?.id === user?.id;
  const canChat = craving?.status === 'accepted' && (isOwn || isAccepter);

  useEffect(() => {
    if (!craving?.id || !canChat || !user?.id) return;
    let cancelled = false;

    getMessages(craving.id).then((rows) => {
      if (!cancelled) setMessages(rows);
    });

    markMessagesRead(craving.id, user.id).catch(() => {});

    const unsubscribe = subscribeToMessages(craving.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_id !== user.id) {
        markMessagesRead(craving.id, user.id).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [craving?.id, canChat, user?.id]);

  const sendMessage = useCallback(async () => {
    const content = msgText.trim();
    if (!content || !craving?.id || !user) return;
    
    setMsgText('');
    const optimistic: MessageRow = {
      id: `pending-${Date.now()}`,
      request_id: craving.id,
      sender_id: user.id,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    
    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await sendRealMessage(craving.id, user.id, content);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('pending-')));
      setMsgText(content);
    }
  }, [msgText, craving?.id, user]);

  if (!craving) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={horror.white} />
          </Pressable>
        </View>
        <View style={{ alignItems: 'center', paddingTop: 60 }}>
          <Image source={batImg} style={{ width: 60, height: 60, opacity: 0.5 }} resizeMode="contain" />
          <Text style={{ color: horror.textSecondary, fontSize: 14, marginTop: 12 }}>Craving not found 👻</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAccept = async () => {
    setAccepting(true);
    await acceptCraving(craving.id);
    setAccepting(false);
  };

  const handleMarkDelivered = async () => {
    setCompleting(true);
    await markAsDelivered(craving.id);
    setCompleting(false);
  };

  const statusLabel = craving.status === 'accepted'
    ? '🤝 Homie Found'
    : craving.status === 'done'
    ? '✅ Satisfied'
    : '🔴 Screaming for Help';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={horror.white} />
          </Pressable>
          <Text style={styles.headerTitle}>👻 Craving Details</Text>
          <Image source={batImg} style={styles.headerBat} resizeMode="contain" />
        </View>

        <FlatList
          data={canChat ? messages : []}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListHeaderComponent={
            <Animated.View style={[styles.detailCard, { opacity: fadeIn }]}>
              <View style={styles.glowBar} />
              
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{craving.postedBy.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.posterName}>{craving.postedBy.name}</Text>
                  <Text style={styles.timeText}>{timeAgo(craving.createdAt)}</Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusLabel}>{statusLabel}</Text>
                </View>
              </View>

              <Text style={styles.whatText}>🍜 {craving.what}</Text>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={16} color={horror.redGlow} />
                  <Text style={styles.infoText}>{craving.hostel}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoText}>💰 ₹{craving.price}</Text>
                </View>
              </View>

              {craving.note ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>📝 Ransom Note</Text>
                  <Text style={styles.noteText}>{craving.note}</Text>
                </View>
              ) : null}

              {craving.status === 'open' && !isOwn && (
                <Pressable
                  style={[styles.acceptBtn, accepting && { opacity: 0.5 }]}
                  onPress={handleAccept}
                  disabled={accepting}
                >
                  <Text style={styles.acceptBtnText}>
                    {accepting ? '⏳ Saving them...' : acceptLabel}
                  </Text>
                </Pressable>
              )}

              {craving.status === 'accepted' && isAccepter && (
                <Pressable
                  style={[styles.acceptBtn, { backgroundColor: horror.redDark }, completing && { opacity: 0.5 }]}
                  onPress={handleMarkDelivered}
                  disabled={completing}
                >
                  <Text style={styles.acceptBtnText}>
                    {completing ? '⏳ Finalizing...' : '📍 Mark as Delivered'}
                  </Text>
                </Pressable>
              )}

              {craving.status === 'open' && isOwn && (
                <View style={styles.waitBanner}>
                  <Text style={styles.waitText}>⏳ Waiting for a midnight hero...</Text>
                </View>
              )}

              {craving.acceptedBy && (
                <View style={styles.rescuerBox}>
                  <View style={styles.rescuerAvatar}>
                    <Text style={styles.rescuerAvatarText}>{craving.acceptedBy.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rescuerLabel}>
                      {isOwn ? '🦸 Your Midnight Hero' : '🦸 You\'re the Hero!'}
                    </Text>
                    <Text style={styles.rescuerName}>{craving.acceptedBy.name}</Text>
                  </View>
                </View>
              )}

              {canChat && (
                <View style={styles.chatHeader}>
                  <Ionicons name="chatbubble-ellipses" size={16} color={horror.white} />
                  <Text style={styles.chatHeaderText}>💬 Night Owl Chat</Text>
                </View>
              )}
            </Animated.View>
          }
          renderItem={({ item }) => {
            const isMine = item.sender_id === user?.id;
            const senderName = isMine ? user?.name : (isOwn ? craving.acceptedBy?.name : craving.postedBy.name) || 'Ghost';
            return (
              <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
                <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleOther]}>
                  {!isMine && <Text style={styles.msgSender}>{senderName}</Text>}
                  <Text style={styles.msgContent}>{item.content}</Text>
                  <Text style={styles.msgTime}>{timeAgo(item.created_at)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            canChat ? (
              <View style={{ paddingHorizontal: spacing.xl, paddingTop: 12 }}>
                <Text style={{ color: horror.muted, fontSize: 12, textAlign: 'center', fontStyle: 'italic' }}>
                  No messages yet — break the ice 🧊
                </Text>
              </View>
            ) : null
          }
        />

        {/* Chat input */}
        {canChat && (
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={styles.msgInput}
              placeholder="Type a message..."
              placeholderTextColor={horror.muted}
              value={msgText}
              onChangeText={setMsgText}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <Pressable style={styles.sendBtn} onPress={sendMessage} disabled={!msgText.trim()}>
              <Ionicons name="send" size={18} color={msgText.trim() ? '#fff' : horror.muted} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: horror.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: horror.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: horror.redBright,
    textShadowColor: horror.red,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  headerBat: { width: 24, height: 24, opacity: 0.7 },
  detailCard: {
    backgroundColor: horror.cardBg,
    borderRadius: radius.lg,
    padding: 18,
    marginHorizontal: spacing.xl,
    marginTop: 12,
    borderWidth: 1,
    borderColor: horror.border,
    overflow: 'hidden',
  },
  glowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: horror.redBright,
    opacity: 0.8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: horror.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  posterName: { color: horror.textPrimary, fontWeight: '700', fontSize: 15 },
  timeText: { color: horror.muted, fontSize: 11, marginTop: 2 },
  statusChip: {
    backgroundColor: horror.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusLabel: { color: horror.textSecondary, fontSize: 10, fontWeight: '700' },
  whatText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: horror.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  infoText: { color: horror.textSecondary, fontSize: 13, fontWeight: '600' },
  noteBox: {
    backgroundColor: horror.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: horror.border,
  },
  noteLabel: { color: horror.redGlow, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  noteText: { color: horror.textSecondary, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  acceptBtn: {
    marginTop: 18,
    backgroundColor: horror.red,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: `0px 0px 28px ${horror.redGlow}50` },
      default: {
        shadowColor: horror.redGlow,
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 4 },
        elevation: 10,
      },
    }),
  },
  acceptBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
  waitBanner: {
    marginTop: 16,
    backgroundColor: horror.surfaceLight,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  waitText: { color: horror.textSecondary, fontSize: 13, fontWeight: '700' },
  rescuerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    backgroundColor: `${horror.redDark}30`,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${horror.red}40`,
  },
  rescuerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: horror.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescuerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  rescuerLabel: { color: horror.redGlow, fontSize: 11, fontWeight: '800' },
  rescuerName: { color: horror.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: horror.border,
  },
  chatHeaderText: { color: horror.white, fontSize: 14, fontWeight: '800' },

  // Messages
  msgRow: { paddingHorizontal: spacing.xl, marginTop: 8, flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgBubble: {
    maxWidth: '78%',
    borderRadius: 14,
    padding: 10,
  },
  msgBubbleMine: { backgroundColor: horror.red, borderBottomRightRadius: 4 },
  msgBubbleOther: { backgroundColor: horror.surfaceLight, borderBottomLeftRadius: 4 },
  msgSender: { color: horror.redGlow, fontSize: 10, fontWeight: '800', marginBottom: 2 },
  msgContent: { color: horror.textPrimary, fontSize: 14, lineHeight: 20 },
  msgTime: { color: horror.muted, fontSize: 9, marginTop: 4, textAlign: 'right' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    backgroundColor: horror.cardBg,
    borderTopWidth: 1,
    borderTopColor: horror.border,
  },
  msgInput: {
    flex: 1,
    backgroundColor: horror.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: horror.textPrimary,
    borderWidth: 1,
    borderColor: horror.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: horror.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
