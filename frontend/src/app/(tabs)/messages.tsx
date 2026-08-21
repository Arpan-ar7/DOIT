import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';
import { formatClockTime } from '../../utils/time';
import { routes } from '../../constants/routes';
import Avatar from '../../components/Avatar';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requests } = useRequests();
  const { conversations, loading } = useConversations(requests, user?.id ?? '');

  return (
    <SafeAreaView style={styles.safe}>
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
          return (
            <Pressable style={styles.row} onPress={() => router.push(routes.chat(item.request.id))}>
              <Avatar initials={otherInitials} backgroundColor="#f7d5c7" textColor="#994327" />
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <View style={styles.nameRow}>
                    {item.unread && <View style={styles.unreadDot} />}
                    <Text style={styles.name} numberOfLines={1}>{otherName}</Text>
                  </View>
                  {item.lastMessage && (
                    <Text style={styles.time}>{formatClockTime(new Date(item.lastMessage.created_at))}</Text>
                  )}
                </View>
                <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={1}>
                  {item.lastMessage
                    ? `${item.lastMessage.sender_id === user?.id ? 'You: ' : ''}${item.lastMessage.content}`
                    : `About "${item.request.itemName}" · Tap to say hi`}
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
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySub}>Accept a request from Home to start chatting with a requester.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40, flexGrow: 1 },
  top: { paddingTop: spacing.lg, paddingBottom: spacing.md },
  h2: { fontSize: 22, fontWeight: '700', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 13, marginBottom: 9 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  name: { fontSize: 14, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  time: { fontSize: 10, color: colors.muted },
  preview: { fontSize: 12, color: colors.muted, marginTop: 3 },
  previewUnread: { color: colors.ink, fontWeight: '600' },
  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: 80, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
