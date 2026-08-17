import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { CURRENT_USER, isExpired, CATEGORIES } from '../../constants/mockData';
import { useCountdown } from '../../hooks/useCountdown';
import { routes } from '../../constants/routes';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRequestById, acceptRequest, cancelRequest } = useRequests();
  const request = getRequestById(id);
  const countdown = useCountdown(request?.expiresAt ?? new Date().toISOString());

  if (!request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFound}>This request no longer exists.</Text>
          <Pressable style={styles.btnOutline} onPress={() => router.back()}>
            <Text style={styles.btnOutlineText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // CHANGED — 'requested' → 'pending' throughout.
  const alreadyAccepted = request.status !== 'pending';
  const isOwnRequest = request.requester.id === CURRENT_USER.id;
  // Only meaningful while still pending — same fix as RequestCard, so an
  // already-accepted/completed request never wrongly shows "expired."
  const expired = request.status === 'pending' && isExpired(request.expiresAt);

  const categoryLabel = CATEGORIES.find((c) => c.key === request.category)?.label ?? 'Other';

  function handleAccept() {
    acceptRequest(request.id);
    router.replace(routes.orderStatus(request.id));
  }

  function handleCancel() {
    cancelRequest(request.id);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Request details" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.emojiBox}>
              <Text style={styles.emoji}>{request.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{request.itemName}</Text>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{categoryLabel}</Text>
              </View>
              {!!request.shop && <Text style={styles.shop}>{request.shop}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Approx item price</Text>
            <Text style={styles.priceValue}>₹{request.itemBudget}</Text>
          </View>
          <View style={[styles.priceRow, styles.priceRowLast]}>
            <Text style={styles.priceLabel}>Delivery fee</Text>
            <Text style={styles.priceValueSmall}>+ ₹{request.deliveryFee}</Text>
          </View>
        </View>

        {request.status === 'pending' && (
          <View style={styles.expiryRow}>
            <Ionicons name="time-outline" size={15} color={colors.muted} />
            <Text style={styles.expiryText}>
              Expires in {countdown} · Accept only if you're already going out
            </Text>
          </View>
        )}

        {!!request.notes && (
          <View style={styles.infoBlock}>
            <View style={styles.infoBlockHeader}>
              <Ionicons name="chatbox-outline" size={16} color={colors.green} />
              <Text style={styles.infoBlockTitle}>Notes</Text>
            </View>
            <Text style={styles.infoBlockText}>{request.notes}</Text>
          </View>
        )}

        <View style={styles.infoBlock}>
          <View style={styles.infoBlockHeader}>
            <Ionicons name="location-outline" size={16} color={colors.green} />
            <Text style={styles.infoBlockTitle}>Delivery location</Text>
          </View>
          <Text style={styles.infoBlockText}>{request.deliveryLocation}</Text>
        </View>

        <View style={styles.requester}>
          <Avatar initials={request.requester.initials} size={39} backgroundColor="#f6d8ca" textColor="#a04d2d" />
          <View style={{ flex: 1 }}>
            <Text style={styles.requesterName}>{request.requester.name}</Text>
            <Text style={styles.requesterSub}>
              ★ {request.requester.rating} · {request.requester.completedRequests} requests
              completed
            </Text>
          </View>
          <Ionicons name="shield-checkmark" size={19} color={colors.green} />
        </View>

        {/* ── Action area — depends on WHO you are and WHAT status it's in ── */}
        {isOwnRequest ? (
          request.status === 'pending' ? (
            // Your own request, nobody's accepted yet → you can still cancel.
            <Pressable style={styles.btnDanger} onPress={handleCancel}>
              <Text style={styles.btnDangerText}>Cancel this request</Text>
            </Pressable>
          ) : request.status === 'cancelled' ? (
            // You already cancelled it — just show that fact, nothing to do.
            <View style={styles.cancelledNotice}>
              <Ionicons name="close-circle" size={16} color="#c14b30" />
              <Text style={styles.cancelledNoticeText}>You cancelled this request.</Text>
            </View>
          ) : (
            // Someone already accepted it — cancelling is no longer allowed.
            // Send them to Order Status to track it instead.
            <Pressable style={styles.btn} onPress={() => router.push(routes.orderStatus(request.id))}>
              <Text style={styles.btnText}>View order status</Text>
            </Pressable>
          )
        ) : expired ? (
          <Pressable style={[styles.btn, styles.btnDisabled]} disabled>
            <Text style={styles.btnText}>Request expired</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              style={[styles.btn, alreadyAccepted && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={alreadyAccepted}
            >
              <Text style={styles.btnText}>
                {alreadyAccepted ? 'Already accepted' : `Accept request · Earn ₹${request.deliveryFee}`}
              </Text>
            </Pressable>
            <Pressable style={styles.btnOutline} onPress={() => router.push(routes.chat(request.id))}>
              <Text style={styles.btnOutlineText}>
                Ask {request.requester.name.split(' ')[0]} a question
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  notFound: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  hero: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: 18, marginTop: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  emojiBox: { width: 61, height: 61, borderRadius: 18, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 29 },
  itemName: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  categoryTag: { alignSelf: 'flex-start', backgroundColor: colors.mint, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, marginBottom: 6 },
  categoryTagText: { fontSize: 11, fontWeight: '700', color: colors.greenDark },
  shop: { fontSize: 12, color: colors.muted },
  priceCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, marginTop: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  priceRowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  priceLabel: { color: colors.muted, fontSize: 13 },
  priceValue: { fontSize: 18, fontWeight: '700', color: colors.greenDark },
  priceValueSmall: { fontSize: 15, fontWeight: '700', color: colors.greenDark },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 2 },
  expiryText: { fontSize: 12, color: colors.muted, flex: 1 },
  infoBlock: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 14, marginTop: 12 },
  infoBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  infoBlockTitle: { fontSize: 12, fontWeight: '700', color: colors.ink },
  infoBlockText: { fontSize: 13, color: '#536366', lineHeight: 19 },
  requester: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 15, marginTop: 12, backgroundColor: '#f4f8f4', borderRadius: 15 },
  requesterName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  requesterSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  btn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnOutline: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bcdcd0' },
  btnOutlineText: { color: colors.green, fontSize: 14, fontWeight: '800' },
  btnDanger: { backgroundColor: '#fdf0ee', borderWidth: 1, borderColor: '#f3c9c0', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnDangerText: { color: '#c14b30', fontSize: 14, fontWeight: '800' },
  cancelledNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fdf0ee', borderRadius: 14, paddingVertical: 15, marginTop: 18 },
  cancelledNoticeText: { color: '#c14b30', fontSize: 13, fontWeight: '700' },
});