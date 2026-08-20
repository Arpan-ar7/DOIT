import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { isExpired, STATUS_LABELS, CATEGORIES, DeliveryRequest } from '../../constants/mockData';
import { minutesLeftLabel } from '../../utils/time';
import { routes } from '../../constants/routes';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#f2f4ee', text: '#627168' },
  expired: { bg: '#f3e9e6', text: '#a05a48' },
  cancelled: { bg: '#fdf0ee', text: '#c14b30' },
  completed: { bg: '#dcf2e8', text: '#0e5545' },
  active: { bg: '#dcf2e8', text: '#166b57' },
};

function getStatusBadge(request: DeliveryRequest) {
  const isPending = request.status === 'pending';
  const isExpiredPending = isPending && isExpired(request.expiresAt);
  if (isExpiredPending) return { key: 'expired', label: 'Expired' };
  if (request.status === 'cancelled') return { key: 'cancelled', label: STATUS_LABELS.cancelled };
  if (request.status === 'completed') return { key: 'completed', label: STATUS_LABELS.completed };
  if (isPending) return { key: 'pending', label: STATUS_LABELS.pending };
  return { key: 'active', label: STATUS_LABELS[request.status] };
}

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { requests, loading, refresh } = useRequests();

  // CHANGED — CURRENT_USER.id -> real user id.
  const myOrders = requests.filter((r) => r.requester.id === user?.id);

  function isOver(r: DeliveryRequest) {
    return r.status === 'cancelled' || r.status === 'completed' || (r.status === 'pending' && isExpired(r.expiresAt));
  }
  const activeOrders = myOrders.filter((r) => !isOver(r));
  const pastOrders = myOrders.filter((r) => isOver(r));

  function handlePress(request: DeliveryRequest) {
    if (request.status === 'pending' || request.status === 'cancelled') {
      router.push(routes.requestDetails(request.id));
    } else {
      router.push(routes.orderStatus(request.id));
    }
  }

  function renderOrderRow(request: DeliveryRequest) {
    const badge = getStatusBadge(request);
    const badgeColors = STATUS_COLORS[badge.key];
    const total = request.itemBudget + request.deliveryFee;
    const categoryLabel = CATEGORIES.find((c) => c.key === request.category)?.label ?? 'Other';

    return (
      <Pressable key={request.id} style={styles.row} onPress={() => handlePress(request)}>
        <View style={styles.emojiBox}><Text style={styles.emoji}>{request.emoji}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName} numberOfLines={1}>{request.itemName}</Text>
          <Text style={styles.itemSub}>{categoryLabel} · ₹{total} total</Text>
          {badge.key === 'pending' && <Text style={styles.countdown}>{minutesLeftLabel(request.expiresAt)}</Text>}
        </View>
        <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[styles.badgeText, { color: badgeColors.text }]}>{badge.label}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.green]} />}
      >
        <View style={styles.top}>
          <Text style={styles.h2}>My Orders</Text>
          <Text style={styles.subtitle}>Requests you've posted, and their live status.</Text>
        </View>

        {loading && myOrders.length === 0 && <ActivityIndicator style={{ marginTop: 30 }} color={colors.green} />}

        {!loading && myOrders.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={30} color={colors.muted} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>Post a request from Home and it'll show up here.</Text>
          </View>
        )}

        {activeOrders.length > 0 && (
          <>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Active</Text></View>
            {activeOrders.map(renderOrderRow)}
          </>
        )}

        {pastOrders.length > 0 && (
          <>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Past</Text></View>
            {pastOrders.map(renderOrderRow)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  top: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  h2: { fontSize: 22, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
  sectionHead: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 13, marginBottom: 9 },
  emojiBox: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  itemSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  countdown: { fontSize: 11, color: colors.orange, fontWeight: '700', marginTop: 3 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
});