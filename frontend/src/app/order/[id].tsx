import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { RequestStatus, CURRENT_USER } from '../../constants/mockData';
import { routes } from '../../constants/routes';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';

const STEPS: { key: RequestStatus; label: string; icon: keyof typeof Ionicons.glyphMap; doneCopy: string; pendingCopy: string }[] = [
  { key: 'pending', label: 'Pending', icon: 'time-outline', doneCopy: 'Request was posted', pendingCopy: 'Waiting to be posted' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark', doneCopy: 'Someone accepted this request', pendingCopy: 'Waiting for someone to accept' },
  { key: 'in_progress', label: 'In Progress', icon: 'bicycle-outline', doneCopy: 'Delivery is in progress', pendingCopy: "Delivery partner is getting your item" },
  { key: 'completed', label: 'Completed', icon: 'sparkles-outline', doneCopy: 'Delivered and completed', pendingCopy: 'Payment and rating confirmed' },
];

const NEXT_ACTION_LABEL: Partial<Record<RequestStatus, string>> = {
  accepted: 'Start delivery',
  in_progress: 'Mark as completed',
};

export default function OrderStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRequestById, advanceStatus, rateRequest } = useRequests();
  const request = getRequestById(id);

  if (!request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>This order no longer exists.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDeliveryPartner = request.accepterId === CURRENT_USER.id;
  const isRequester = request.requester.id === CURRENT_USER.id;

  if (request.status === 'cancelled') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Order status" />
        <View style={styles.center}>
          <Ionicons name="close-circle-outline" size={32} color="#c14b30" />
          <Text style={styles.emptyText}>This request was cancelled by the requester.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.key === request.status);
  const total = request.itemBudget + request.deliveryFee;
  const nextActionLabel = isDeliveryPartner ? NEXT_ACTION_LABEL[request.status] : undefined;

  // Show the "who's delivering this" card only if: you're the one who
  // posted it, AND someone has actually accepted (request.accepter exists).
  // Before acceptance there's nobody to show yet.
  const showAccepterCard = isRequester && !!request.accepter;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Order status"
        rightIcon="chatbubble-outline"
        onRightPress={() => router.push(routes.chat(request.id))}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.emojiBox}>
            <Text style={styles.emoji}>{request.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{request.itemName}</Text>
            <Text style={styles.subtext}>
              For {request.requester.name} · Total ₹{total}
            </Text>
          </View>
          <View style={styles.activeTag}>
            <Text style={styles.activeTagText}>{request.status === 'completed' ? 'Done' : 'Active'}</Text>
          </View>
        </View>

        {/* ── NEW — Delivery partner reveal ─────────────────────────────
            Only the requester sees this, only once someone's accepted. */}
        {showAccepterCard && request.accepter && (
          <View style={styles.accepterCard}>
            <View style={styles.accepterHeader}>
              <Avatar
                initials={request.accepter.initials}
                backgroundColor="#d4e8f8"
                textColor="#236b95"
                size={44}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.accepterName}>{request.accepter.name}</Text>
                <Text style={styles.accepterSub}>
                  ★ {request.accepter.rating} · {request.accepter.completedRequests} deliveries
                </Text>
              </View>
              <Ionicons name="shield-checkmark" size={18} color={colors.green} />
            </View>

            {/* Phone number is GATED behind the accepter's own "Share phone
                number" preference (Settings) — never shown if they opted out. */}
            {request.accepter.sharePhone ? (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={14} color={colors.green} />
                <Text style={styles.phoneText}>{request.accepter.phone}</Text>
              </View>
            ) : (
              <View style={styles.phoneRow}>
                <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
                <Text style={styles.phoneHiddenText}>Phone number not shared — message them in chat instead.</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.timelineCard}>
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <View key={step.key} style={[styles.stepRow, index === STEPS.length - 1 && { paddingBottom: 0 }]}>
                {index !== STEPS.length - 1 && (
                  <View style={[styles.connector, isDone && styles.connectorDone]} />
                )}
                <View style={[styles.dot, isDone && styles.dotDone, isCurrent && styles.dotCurrent]}>
                  <Ionicons
                    name={isDone ? 'checkmark' : step.icon}
                    size={15}
                    color={isDone || isCurrent ? '#fff' : '#95a29a'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text style={[styles.stepCopy, isCurrent && styles.stepCopyCurrent]}>
                    {isDone || isCurrent ? step.doneCopy : step.pendingCopy}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {nextActionLabel && (
          <Pressable style={styles.btn} onPress={() => advanceStatus(request.id)}>
            <Text style={styles.btnText}>{nextActionLabel}</Text>
          </Pressable>
        )}

        {isRequester && !isDeliveryPartner && request.status !== 'completed' && (
          <Text style={styles.trackingNote}>
            You'll see this update automatically as your delivery partner makes progress.
          </Text>
        )}

        {request.status === 'completed' && (
          <View style={styles.doneBanner}>
            <Ionicons name="sparkles" size={18} color={colors.green} />
            <Text style={styles.doneBannerText}>
              Delivery complete — ₹{request.deliveryFee} added to your earnings.
            </Text>
          </View>
        )}

        {isRequester && request.status === 'completed' && !request.rating && (
          <View style={styles.rateCard}>
            <Text style={styles.rateTitle}>Rate this delivery</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => rateRequest(request.id, n)}>
                  <Ionicons name="star-outline" size={26} color={colors.orange} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {isRequester && request.status === 'completed' && !!request.rating && (
          <Text style={styles.ratedText}>You rated this delivery {request.rating} ★</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 15, marginTop: 12 },
  emojiBox: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  subtext: { fontSize: 12, color: colors.muted, marginTop: 3 },
  activeTag: { backgroundColor: colors.mint, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  activeTagText: { fontSize: 11, fontWeight: '700', color: colors.green },
  // Accepter reveal card
  accepterCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 15, marginTop: 12 },
  accepterHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  accepterName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  accepterSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  phoneText: { fontSize: 13, fontWeight: '700', color: colors.green },
  phoneHiddenText: { fontSize: 11, color: colors.muted, flex: 1 },
  timelineCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: 18, marginTop: 18 },
  stepRow: { flexDirection: 'row', gap: 13, paddingBottom: 22, position: 'relative' },
  connector: { position: 'absolute', left: 15, top: 34, bottom: 0, width: 2, backgroundColor: '#e1e8e2' },
  connectorDone: { backgroundColor: colors.mint },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#edf0ec', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dotDone: { backgroundColor: colors.green },
  dotCurrent: { backgroundColor: colors.green, borderWidth: 5, borderColor: '#dff1e8' },
  stepLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  stepCopy: { fontSize: 11, color: colors.muted },
  stepCopyCurrent: { color: colors.green, fontWeight: '700' },
  btn: { backgroundColor: colors.orange, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  trackingNote: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 17 },
  doneBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.mint, borderRadius: 14, padding: 14, marginTop: 18 },
  doneBannerText: { flex: 1, fontSize: 12, color: colors.greenDark, fontWeight: '600' },
  rateCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, marginTop: 14, alignItems: 'center' },
  rateTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  starRow: { flexDirection: 'row', gap: 8 },
  ratedText: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 14 },
});