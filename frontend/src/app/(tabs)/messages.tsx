import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import AnimatedEmptyState from '../../components/AnimatedEmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors as lightColors, darkThemeColors, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useConversations } from '../../hooks/useConversations';
import { formatClockTime } from '../../utils/time';
import { routes } from '../../constants/routes';
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

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requests } = useRequests();
  const { conversations, loading, clearUnread } = useConversations(requests, user?.id ?? '');
  
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? darkThemeColors : lightColors;
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.request.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View style={styles.top}><Text style={styles.h2}>Messages</Text></View>}
        renderItem={({ item }) => {
          const otherName =
            user?.id === item.request.requester.id
              ? item.request.accepter?.name ?? 'Deliverer'
              : item.request.requester.name;
          const otherInitials =
            user?.id === item.request.requester.id
              ? item.request.accepter?.initials ?? '?'
              : item.request.requester.initials;
          const isCompletedBuffer = item.request.status === 'completed';
          const isImage = item.lastMessage ? isImageUrl(item.lastMessage.content) : false;
          const isFromMe = item.lastMessage?.sender_id === user?.id;

          const previewText = !item.lastMessage
            ? `About "${item.request.itemName}" · Tap to say hi`
            : isImage
            ? isFromMe
              ? `📷 You sent a photo for this order`
              : `📷 Received a photo for this order`
            : `${isFromMe ? 'You: ' : ''}${item.lastMessage.content}`;

          return (
            <Pressable style={styles.row} onPress={() => {
              clearUnread(item.request.id);
              router.push(routes.chat(item.request.id));
            }}>
              <Avatar
                initials={otherInitials}
                imageUri={
                  user?.id === item.request.requester.id
                    ? item.request.accepter?.photoUri
                    : item.request.requester.photoUri
                }
                backgroundColor="#f7d5c7"
                textColor="#994327"
              />
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <View style={styles.nameRow}>
                    {item.unread && <View style={styles.unreadDot} />}
                    <Text style={styles.name} numberOfLines={1}>{otherName}</Text>
                    {isCompletedBuffer && (
                      <View style={[styles.deliveredBadge, isDarkMode && styles.deliveredBadgeDark]}>
                        <Text style={styles.deliveredBadgeText}>Delivered · Ends soon</Text>
                      </View>
                    )}
                  </View>
                  {item.lastMessage && (
                    <Text style={styles.time}>{formatClockTime(new Date(item.lastMessage.created_at))}</Text>
                  )}
                </View>
                <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={1}>
                  {previewText}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ba6a0" />
            </Pressable>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.green} />
            </View>
          ) : (
            <AnimatedEmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              subtitle="Accept a request from Home to start chatting with a requester."
            />
          )
        }
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 120, flexGrow: 1 },
  top: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  h2: { fontSize: 22, fontWeight: '700', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 13, marginBottom: 9 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  name: { fontSize: 14, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  deliveredBadge: { backgroundColor: '#eefcf6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  deliveredBadgeDark: { backgroundColor: '#1e382b' },
  deliveredBadgeText: { fontSize: 10, color: colors.green, fontWeight: '600' },
  time: { fontSize: 10, color: colors.muted },
  preview: { fontSize: 12, color: colors.muted, marginTop: 3 },
  previewUnread: { color: colors.ink, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: 80, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
