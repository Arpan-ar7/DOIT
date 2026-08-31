import React from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors as lightColors, darkThemeColors, radius, spacing } from '../constants/theme';
import { useRequests } from '../context/RequestsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isExpired, CATEGORIES, DeliveryRequest } from '../constants/mockData';
import { routes } from '../constants/routes';
import ScreenHeader from '../components/ScreenHeader';

type HistoryBadge = 'completed' | 'cancelled' | 'expired' | 'delivered';

function getBadge(r: DeliveryRequest, asAccepter: boolean): { label: string; key: HistoryBadge } {
  if (asAccepter) return { label: 'Delivered', key: 'delivered' };
  if (r.status === 'completed') return { label: 'Completed', key: 'completed' };
  if (r.status === 'cancelled') return { label: 'Cancelled', key: 'cancelled' };
  return { label: 'Expired', key: 'expired' };
}

const getBadgeColors = (isDark: boolean): Record<HistoryBadge, { bg: string; text: string }> => ({
  completed: { bg: isDark ? '#1a362a' : '#dcf2e8', text: isDark ? '#54f0c4' : '#0e5545' },
  delivered: { bg: isDark ? '#1a302e' : '#d4f1e8', text: isDark ? '#54d4a0' : '#0a4a38' },
  cancelled: { bg: isDark ? '#3d241c' : '#fdf0ee', text: isDark ? '#ff6b6b' : '#c14b30' },
  expired:   { bg: isDark ? '#2c3639' : '#f2f4ee', text: isDark ? '#a0b0b4' : '#627168' },
});

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requests, loading } = useRequests();
  const { isDarkMode } = useTheme();

  const colors = isDarkMode ? darkThemeColors : lightColors;
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const BADGE_COLORS = React.useMemo(() => getBadgeColors(isDarkMode), [isDarkMode]);

  function isPast(r: DeliveryRequest) {
    return (
      r.status === 'completed' ||
      r.status === 'cancelled' ||
      (r.status === 'pending' && isExpired(r.expiresAt))
    );
  }

  // Build combined list — delivered ones (accepted by me) + my posted ones that are over
  type HistoryItem = DeliveryRequest & { _asAccepter: boolean };

  const history: HistoryItem[] = [
    ...requests
      .filter((r) => r.accepterId === user?.id && r.status === 'completed')
      .map((r) => ({ ...r, _asAccepter: true })),
    ...requests
      .filter((r) => r.requester.id === user?.id && isPast(r))
      .map((r) => ({ ...r, _asAccepter: false })),
  ].sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());

  function handlePress(r: HistoryItem) {
    if (r.status === 'completed' || r.status === 'accepted' || r.status === 'in_progress') {
      router.push(routes.orderStatus(r.id));
    } else {
      router.push(routes.requestDetails(r.id));
    }
  }

  function renderItem({ item }: { item: HistoryItem }) {
    const badge = getBadge(item, item._asAccepter);
    const bc = BADGE_COLORS[badge.key];
    const total = item.itemBudget + item.deliveryFee;
    const categoryLabel = CATEGORIES.find((c) => c.key === item.category)?.label ?? 'Other';

    return (
      <Pressable style={styles.row} onPress={() => handlePress(item)}>
        <View style={styles.emojiBox}><Text style={styles.emoji}>{item.emoji}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName} numberOfLines={1}>{item.itemName}</Text>
          <Text style={styles.itemSub}>
            {categoryLabel} · ₹{total}
            {item._asAccepter ? ` · For ${item.requester.name.split(' ')[0]}` : ''}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: bc.bg }]}>
          <Text style={[styles.badgeText, { color: bc.text }]}>{badge.label}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Order history" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.green} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => `${item.id}-${item._asAccepter}`}
          contentContainerStyle={styles.content}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={42} color={colors.muted} />
              <Text style={styles.emptyTitle}>No history yet</Text>
              <Text style={styles.emptySub}>Completed and expired orders will appear here.</Text>
            </View>
          }
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingTop: 12, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
    marginBottom: 9,
  },
  emojiBox: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  itemSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});
