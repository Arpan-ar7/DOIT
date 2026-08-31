import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatClockTime } from '../../utils/time';
import { getMessages, sendMessage, subscribeToMessages, markMessagesRead, MessageRow } from '../../lib/messagesApi';
import { uploadChatImage } from '../../lib/storage';
import Avatar from '../../components/Avatar';

function isImageUrl(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  const t = content.trim().toLowerCase();
  return (
    t.startsWith('http://') ||
    t.startsWith('https://') ||
    t.startsWith('file://') ||
    t.startsWith('blob:') ||
    t.startsWith('content://') ||
    t.startsWith('data:image/') ||
    t.includes('/storage/') ||
    t.includes('profilepic') ||
    /\.(jpg|jpeg|png|webp|gif|bmp|heic)(\?.*)?$/i.test(t)
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRequestById } = useRequests();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const request = getRequestById(id);

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef<ScrollView>(null);

  // Chat buffer: 10 minutes (600,000 ms) after delivery completion
  const CHAT_BUFFER_MS = 10 * 60 * 1000;
  const completionTimeStr = request?.completedAt || request?.updatedAt;
  const completedMs = completionTimeStr ? new Date(completionTimeStr).getTime() : 0;
  const remainingMs = completedMs ? Math.max(0, completedMs + CHAT_BUFFER_MS - now) : 0;
  const inBuffer = request?.status === 'completed' && remainingMs > 0;
  const chatEnded = request?.status === 'completed' && remainingMs <= 0;
  const chatOpen = request?.status === 'accepted' || request?.status === 'in_progress' || inBuffer;

  // Live 1-second countdown when in the 10-minute completion buffer
  useEffect(() => {
    if (request?.status !== 'completed' || remainingMs <= 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [request?.status, remainingMs > 0]);

  function formatRemainingTime(ms: number) {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    }
    return `${secs}s`;
  }

  const isRequester = user?.id === request?.requester.id;
  const other = request
    ? isRequester
      ? { name: request.accepter?.name ?? 'Deliverer', initials: request.accepter?.initials ?? '?', photoUri: request.accepter?.photoUri }
      : { name: request.requester.name, initials: request.requester.initials, photoUri: request.requester.photoUri }
    : null;

  const systemMessageText = isRequester
    ? `${other?.name ?? 'Someone'} accepted your request for ${request?.itemName}`
    : `You accepted ${other?.name ?? 'Someone'}'s request for ${request?.itemName}`;

  useEffect(() => {
    if (!request || !user) return;
    let cancelled = false;

    setLoading(true);
    getMessages(request.id)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    if (chatOpen) {
      markMessagesRead(request.id, user.id).catch(() => {});

      const unsubscribe = subscribeToMessages(request.id, (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          // If this is our own message and we have an optimistic pending bubble, replace it
          const pendingIdx = prev.findIndex(
            (m) => m.id.startsWith('pending-') && m.sender_id === msg.sender_id && (m.content === msg.content || m.id.startsWith('pending-img-'))
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = msg;
            return next;
          }
          return [...prev, msg];
        });
        if (msg.sender_id !== user.id) {
          markMessagesRead(request.id, user.id).catch(() => {});
        }
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
      });

      return () => {
        cancelled = true;
        unsubscribe();
      };
    }
  }, [request?.id, chatOpen, user?.id]);

  async function handleSend() {
    const content = text.trim();
    if (!content || !request || !user || sending) return;
    setText('');
    setSending(true);
    try {
      // Optimistic bubble — the realtime INSERT event for our own message
      // still arrives, but the id-dedupe absorbs it once it does.
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
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === saved.id);
        if (alreadyExists) {
          return prev.filter((m) => m.id !== optimistic.id);
        }
        return prev.map((m) => (m.id === optimistic.id ? saved : m));
      });
    } catch (e) {
      // Send failed (offline / RLS) — drop the optimistic bubble and give
      // the text back so nothing is silently lost.
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('pending-')));
      setText(content);
    } finally {
      setSending(false);
    }
  }

  async function processSelectedImage(localUri: string) {
    if (!request || !user) return;
    setUploadingImage(true);

    const tempId = `pending-img-${Date.now()}`;
    const optimistic: MessageRow = {
      id: tempId,
      request_id: request.id,
      sender_id: user.id,
      content: localUri,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const publicUrl = await uploadChatImage(request.id, localUri);
      const saved = await sendMessage(request.id, user.id, publicUrl);
      setMessages((prev) => {
        const alreadyExists = prev.some((m) => m.id === saved.id);
        if (alreadyExists) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? saved : m));
      });
    } catch (err: any) {
      console.error('Failed to send image:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Upload failed', err.message || 'Could not send image.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleTakePhoto() {
    if (!request || !user || sending || uploadingImage) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access in your device settings to take and send photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    await processSelectedImage(result.assets[0].uri);
  }

  async function handleChooseFromLibrary() {
    if (!request || !user || sending || uploadingImage) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo gallery access to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    await processSelectedImage(result.assets[0].uri);
  }

  function handlePickImage() {
    if (!request || !user || sending || uploadingImage) return;

    Alert.alert(
      'Send Photo',
      'Choose an option:',
      [
        {
          text: '📷 Take Photo',
          onPress: handleTakePhoto,
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: handleChooseFromLibrary,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }

  const uniqueMessages = React.useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  if (!request) {
    return (
      <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
        <View style={styles.center}>
          <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>This conversation no longer exists.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[styles.top, isDarkMode && styles.topDark]}>
          <Pressable style={[styles.iconBtn, isDarkMode && styles.iconBtnDark]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#fff' : colors.ink} />
          </Pressable>
          <View style={styles.person}>
            <Avatar initials={other?.initials ?? '?'} imageUri={other?.photoUri} backgroundColor={isDarkMode ? '#1a2e45' : '#d4e8f8'} textColor={isDarkMode ? '#54a0d2' : '#236b95'} />
            <View>
              <Text style={[styles.personName, isDarkMode && styles.personNameDark]}>{other?.name}</Text>
            </View>
          </View>
        </View>

        {/* Active buffer countdown banner */}
        {inBuffer && (
          <View style={[styles.bufferBanner, isDarkMode && styles.bufferBannerDark]}>
            <Ionicons name="time-outline" size={16} color={isDarkMode ? '#ffb38a' : '#c25e00'} />
            <Text style={[styles.bufferBannerText, isDarkMode && styles.bufferBannerTextDark]}>
              Delivery completed · Chat will end in {formatRemainingTime(remainingMs)}
            </Text>
          </View>
        )}

        {/* Closed chat banner (completed requests past 10 min) */}
        {chatEnded && (
          <View style={[styles.systemMessage, isDarkMode && styles.systemMessageDark, { marginTop: 12 }]}>
            <Text style={[styles.systemMessageText, isDarkMode && styles.systemMessageTextDark]}>
              This delivery is complete. Chat is now closed.
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.green} /></View>
        ) : (
          <>
            {uniqueMessages.length === 0 ? (
              <View style={styles.center}>
                <View style={[styles.systemMessage, isDarkMode && styles.systemMessageDark]}>
                  <Text style={[styles.systemMessageText, isDarkMode && styles.systemMessageTextDark]}>{systemMessageText}</Text>
                </View>
                <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
                  No messages yet. Say hi to coordinate pickup and dropoff!
                </Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.chatArea}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
              >
                <View style={[styles.systemMessage, isDarkMode && styles.systemMessageDark]}>
                  <Text style={[styles.systemMessageText, isDarkMode && styles.systemMessageTextDark]}>{systemMessageText}</Text>
                </View>
                {uniqueMessages.map((m) => {
                  const fromMe = m.sender_id === user?.id;
                  const isImage = isImageUrl(m.content);
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.bubble,
                        fromMe ? styles.bubbleMe : [styles.bubbleThem, isDarkMode && styles.bubbleThemDark],
                        isImage && styles.bubbleImageContainer,
                      ]}
                    >
                      {isImage ? (
                        <Pressable onPress={() => setSelectedImage(m.content)}>
                          <Image
                            source={{ uri: m.content }}
                            style={styles.chatImage}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ) : (
                        <Text style={fromMe ? styles.bubbleTextMe : [styles.bubbleTextThem, isDarkMode && styles.bubbleTextThemDark]}>
                          {m.content}
                        </Text>
                      )}
                      <Text style={[styles.bubbleTime, isDarkMode && !fromMe && styles.bubbleTimeDark, isImage && styles.imageTime]}>
                        {formatClockTime(new Date(m.created_at))}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {chatOpen && (
              <View style={[styles.inputRow, isDarkMode && styles.inputRowDark]}>
                <Pressable
                  style={[styles.attachBtn, isDarkMode && styles.attachBtnDark]}
                  onPress={handlePickImage}
                  disabled={sending || uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.green} />
                  ) : (
                    <Ionicons name="camera-outline" size={22} color={isDarkMode ? '#8a9e9f' : colors.muted} />
                  )}
                </Pressable>
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputBoxDark]}
                  placeholder={`Message ${other?.name?.split(' ')[0] ?? ''}...`}
                  placeholderTextColor={isDarkMode ? '#8a9e9f' : colors.muted}
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  editable={!sending && !uploadingImage}
                />
                <Pressable style={styles.sendBtn} onPress={handleSend} disabled={sending || uploadingImage || !text.trim()}>
                  <Ionicons name="send" size={18} color="#fff" />
                </Pressable>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>

      {/* Full-Screen Image Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.modalContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
  bubbleImageContainer: {
    padding: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  chatImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  imageTime: {
    marginTop: 2,
    marginRight: 4,
  },
  bubbleTextThem: { fontSize: 13, lineHeight: 18, color: colors.ink },
  bubbleTextMe: { fontSize: 13, lineHeight: 18, color: '#174e3e' },
  bubbleTime: { fontSize: 9, opacity: 0.58, textAlign: 'right', marginTop: 4, color: colors.ink },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  attachBtn: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#fafbf8',
    borderWidth: 1,
    borderColor: '#e2e7e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnDark: {
    backgroundColor: '#1a2221',
    borderColor: '#2d3b38',
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
    color: colors.ink,
  },
  sendBtn: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // System Message Styles
  systemMessage: { backgroundColor: '#eefcf6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'center', marginBottom: 10 },
  systemMessageText: { fontSize: 12, color: colors.greenDark, textAlign: 'center' },

  // Full Screen Modal Image Styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },

  // Buffer Banner Styles
  bufferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff4eb',
    borderBottomWidth: 1,
    borderBottomColor: '#f7d6bf',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  bufferBannerDark: {
    backgroundColor: '#352012',
    borderBottomColor: '#53311c',
  },
  bufferBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a04800',
  },
  bufferBannerTextDark: {
    color: '#ffb38a',
  },

  // Dark Mode Styles
  safeDark: { backgroundColor: colors.ink },
  topDark: { backgroundColor: colors.ink, borderBottomColor: '#2d3b38' },
  iconBtnDark: { backgroundColor: '#1a2221' },
  personNameDark: { color: '#f8f8f8' },
  emptyTextDark: { color: '#8a9e9f' },
  systemMessageDark: { backgroundColor: '#1e382b' },
  systemMessageTextDark: { color: colors.mint, fontWeight: '600' },
  bubbleThemDark: { backgroundColor: '#1a2221', borderColor: '#2d3b38' },
  bubbleTextThemDark: { color: '#f8f8f8' },
  bubbleTimeDark: { color: '#f8f8f8' },
  inputRowDark: { backgroundColor: colors.ink, borderTopColor: '#2d3b38' },
  inputBoxDark: { backgroundColor: '#1a2221', borderColor: '#2d3b38', color: '#fff' },
});
