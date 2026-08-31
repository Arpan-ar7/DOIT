import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import AnimatedEmptyState from '../../components/AnimatedEmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors as lightColors, darkThemeColors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isExpired, STATUS_LABELS, CATEGORIES, DeliveryRequest } from '../../constants/mockData';
import { minutesLeftLabel } from '../../utils/time';
import { routes } from '../../constants/routes';

const getStatusColors = (isDark: boolean) => ({
  pending: { bg: isDark ? '#2c3639' : '#f2f4ee', text: isDark ? '#a0b0b4' : '#627168' },
  accepted: { bg: isDark ? '#1a362a' : '#dcf2e8', text: isDark ? '#54f0c4' : '#166b57' },
  in_progress: { bg: isDark ? '#2a2a1a' : '#fdf4dc', text: isDark ? '#f0c454' : '#8a6a00' },
});

function getStatusBadge(request: DeliveryRequest) {
  if (request.status === 'accepted') return { key: 'accepted', label: 'Accepted' };
  if (request.status === 'in_progress') return { key: 'in_progress', label: 'In Progress' };
  return { key: 'pending', label: STATUS_LABELS.pending };
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requests, loading, refresh } = useRequests();

  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? darkThemeColors : lightColors;
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const STATUS_COLORS = React.useMemo(() => getStatusColors(isDarkMode), [isDarkMode]);

  function isActive(r: DeliveryRequest) {
    if (r.status === 'cancelled' || r.status === 'completed') return false;
    if (r.status === 'pending' && isExpired(r.expiresAt)) return false;
    return true;
  }

  // Active orders only
  const delivering = requests.filter((r) => r.accepterId === user?.id && isActive(r));
  const myRequests = requests.filter((r) => r.requester.id === user?.id && isActive(r));
  const hasActive = delivering.length > 0 || myRequests.length > 0;

  function handlePress(request: DeliveryRequest) {
    if (request.status === 'pending') {
      router.push(routes.requestDetails(request.id));
    } else {
      router.push(routes.orderStatus(request.id));
    }
  }

  function renderOrderRow(request: DeliveryRequest) {
    const badge = getStatusBadge(request);
    const badgeColors = (STATUS_COLORS as Record<string, { bg: string; text: string }>)[badge.key];
    const total = request.itemBudget + request.deliveryFee;
    const categoryLabel = CATEGORIES.find((c) => c.key === request.category)?.label ?? 'Other';

    return (
      <Pressable key={request.id} style={styles.row} onPress={() => handlePress(request)}>
        <View style={styles.emojiBox}><Text style={styles.emoji}>{request.emoji}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName} numberOfLines={1}>{request.itemName}</Text>
          <Text style={styles.itemSub}>{categoryLabel} · ₹{total} total</Text>
          {request.status === 'pending' && (
            <Text style={styles.countdown}>{minutesLeftLabel(request.expiresAt)}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors.text }]}>{badge.label}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.green]} />}
      >
        <View style={styles.top}>
          <Text style={styles.h2}>Active Orders</Text>
          <Text style={styles.subtitle}>Your live requests and deliveries</Text>
        </View>

        {loading && !hasActive && <ActivityIndicator style={{ marginTop: 30 }} color={colors.green} />}

        {!loading && !hasActive && (
          <AnimatedEmptyState
            icon="receipt-outline"
            title="No active orders"
            subtitle="Post a request from Home or accept one from the feed."
          />
        )}

        {delivering.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <View style={styles.sectionBadge}>
                <Ionicons name="bicycle-outline" size={14} color={colors.green} />
                <Text style={styles.sectionTitle}>You're delivering</Text>
              </View>
            </View>
            {delivering.map(renderOrderRow)}
          </>
        )}

        {myRequests.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <View style={styles.sectionBadge}>
                <Ionicons name="cube-outline" size={14} color={colors.green} />
                <Text style={styles.sectionTitle}>Your requests</Text>
              </View>
            </View>
            {myRequests.map(renderOrderRow)}
          </>
        )}

        {/* History nudge */}
        {hasActive && (
          <Pressable style={styles.historyNudge} onPress={() => router.push(routes.orderHistory())}>
            <Text style={styles.historyNudgeText}>View past orders in Profile → Order history</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.muted} />
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  top: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  h2: { fontSize: 22, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
  sectionHead: { marginTop: 22, marginBottom: 10 },
  sectionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
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
  countdown: { fontSize: 11, color: colors.orange, fontWeight: '700', marginTop: 3 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  historyNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 18,
    paddingVertical: 10,
  },
  historyNudgeText: { fontSize: 12, color: colors.muted },
});