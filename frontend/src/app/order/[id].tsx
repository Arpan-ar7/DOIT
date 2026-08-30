import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { RequestStatus } from '../../constants/mockData';
import { routes } from '../../constants/routes';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';

const STEPS: { key: RequestStatus; label: string; icon: keyof typeof Ionicons.glyphMap; doneCopy: string; pendingCopy: string }[] = [
  { key: 'pending', label: 'Pending', icon: 'time-outline', doneCopy: 'Request was posted', pendingCopy: 'Waiting to be posted' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark', doneCopy: 'Someone accepted this request', pendingCopy: 'Waiting for someone to accept' },
  { key: 'in_progress', label: 'In Progress', icon: 'bicycle-outline', doneCopy: 'Delivery is in progress', pendingCopy: 'Delivery partner is getting your item' },
  { key: 'completed', label: 'Completed', icon: 'sparkles-outline', doneCopy: 'Delivered and completed', pendingCopy: 'Payment and rating confirmed' },
];

export default function OrderStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { getRequestById, advanceStatus, rateRequest } = useRequests();
  const request = getRequestById(id);

  const [completing, setCompleting] = useState(false);
  const [rating, setRating] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!request) {
    return (
      <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
        <View style={styles.center}><Text style={styles.emptyText}>This order no longer exists.</Text></View>
      </SafeAreaView>
    );
  }

  // CHANGED — CURRENT_USER.id -> real user id.
  const isDeliveryPartner = request.accepterId === user?.id;
  const isRequester = request.requester.id === user?.id;

  if (request.status === 'cancelled') {
    return (
      <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
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
  // CHANGED — only one action exists now: jump straight to completed.
  // No "Start delivery" button, since the backend has no in-between step.
  const canComplete = isDeliveryPartner && (request.status === 'accepted' || request.status === 'in_progress');
  const showAccepterCard = isRequester && !!request.accepter;

  async function handleComplete() {
    if (!request) return;
    setActionError('');
    setCompleting(true);
    const result = await advanceStatus(request.id);
    setCompleting(false);
    if (!result.success) setActionError(result.error ?? 'Could not mark as completed.');
  }

  async function handleRate(score: number) {
    if (!request) return;
    if (rating) return;
    setActionError('');
    setRating(true);
    const result = await rateRequest(request.id, score);
    setRating(false);
    if (!result.success) setActionError(result.error ?? 'Could not submit rating.');
  }

  return (
    <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
      <ScreenHeader title="Order status" rightIcon="chatbubble-outline" onRightPress={() => router.push(routes.chat(request.id))} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.summaryCard, isDarkMode && styles.cardDark]}>
          <View style={styles.emojiBox}><Text style={styles.emoji}>{request.emoji}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, isDarkMode && styles.textWhite]}>{request.itemName}</Text>
            <Text style={[styles.subtext, isDarkMode && styles.textMuted]}>For {request.requester.name} · Total ₹{total}</Text>
          </View>
          <View style={[styles.activeTag, isDarkMode && styles.activeTagDark]}><Text style={[styles.activeTagText, isDarkMode && styles.activeTagTextDark]}>{request.status === 'completed' ? 'Done' : 'Active'}</Text></View>
        </View>

        {/* Delivery partner reveal — phone-sharing block removed entirely
            per your last message; just name/rating now. */}
        {showAccepterCard && request.accepter && (
          <View style={[styles.accepterCard, isDarkMode && styles.cardDark]}>
            <Avatar initials={request.accepter.initials} imageUri={request.accepter.photoUri} backgroundColor={isDarkMode ? '#1a2e45' : '#d4e8f8'} textColor={isDarkMode ? '#54a0d2' : '#236b95'} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.accepterName, isDarkMode && styles.textWhite]}>{request.accepter.name}</Text>
              <Text style={[styles.accepterSub, isDarkMode && styles.textMuted]}>★ {request.accepter.rating.toFixed(1)} · {request.accepter.completedRequests} deliveries</Text>
            </View>
            <Ionicons name="shield-checkmark" size={18} color={isDarkMode ? '#54f0c4' : colors.green} />
          </View>
        )}

        <View style={[styles.timelineCard, isDarkMode && styles.cardDark]}>
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <View key={step.key} style={[styles.stepRow, index === STEPS.length - 1 && { paddingBottom: 0 }]}>
                {index !== STEPS.length - 1 && <View style={[styles.connector, isDarkMode && styles.connectorDark, isDone && styles.connectorDone]} />}
                <View style={[styles.dot, isDarkMode && styles.dotDark, isDone && styles.dotDone, isCurrent && [styles.dotCurrent, isDarkMode && styles.dotCurrentDark]]}>
                  <Ionicons name={isDone ? 'checkmark' : step.icon} size={15} color={isDone || isCurrent ? '#fff' : (isDarkMode ? '#8a9e9f' : '#95a29a')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepLabel, isDarkMode && styles.textWhite]}>{step.label}</Text>
                  <Text style={[styles.stepCopy, isDarkMode && styles.textMuted, isCurrent && [styles.stepCopyCurrent, isDarkMode && styles.stepCopyCurrentDark]]}>{isDone || isCurrent ? step.doneCopy : step.pendingCopy}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}

        {canComplete && (
          <Pressable style={styles.btn} onPress={handleComplete} disabled={completing}>
            <Text style={styles.btnText}>{completing ? 'Marking as completed...' : 'Mark as completed'}</Text>
          </Pressable>
        )}

        {isRequester && !isDeliveryPartner && request.status !== 'completed' && (
          <Text style={[styles.trackingNote, isDarkMode && styles.textMuted]}>You'll see this update automatically as your delivery partner makes progress.</Text>
        )}

        {request.status === 'completed' && (
          <View style={[styles.doneBanner, isDarkMode && styles.doneBannerDark]}>
            <Ionicons name="sparkles" size={18} color={isDarkMode ? '#54f0c4' : colors.green} />
            <Text style={[styles.doneBannerText, isDarkMode && styles.doneBannerTextDark]}>Delivery complete — ₹{request.deliveryFee} added to your earnings.</Text>
          </View>
        )}

        {isRequester && request.status === 'completed' && !request.rating && (
          <View style={[styles.rateCard, isDarkMode && styles.cardDark]}>
            <Text style={[styles.rateTitle, isDarkMode && styles.textWhite]}>
              {rating ? 'Submitting rating...' : 'Rate this delivery'}
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => handleRate(n)} disabled={rating} hitSlop={6}>
                  <Ionicons name="star-outline" size={26} color={colors.orange} />
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {isRequester && request.status === 'completed' && !!request.rating && (
          <Text style={[styles.ratedText, isDarkMode && styles.textMuted]}>You rated this delivery {request.rating} ★</Text>
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
  accepterCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 15, marginTop: 12 },
  accepterName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  accepterSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
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
  errorText: { color: '#c14b30', fontSize: 12, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  btn: { backgroundColor: colors.orange, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  trackingNote: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 16, lineHeight: 17 },
  doneBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.mint, borderRadius: 14, padding: 14, marginTop: 18 },
  doneBannerText: { flex: 1, fontSize: 12, color: colors.greenDark, fontWeight: '600' },
  rateCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, marginTop: 14, alignItems: 'center' },
  rateTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  starRow: { flexDirection: 'row', gap: 8 },
  ratedText: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 14 },

  // Dark mode
  safeDark: { backgroundColor: colors.ink },
  cardDark: { backgroundColor: '#1a2221', borderColor: '#2d3b38' },
  textWhite: { color: '#f8f8f8' },
  textMuted: { color: '#8a9e9f' },
  activeTagDark: { backgroundColor: '#1e382b' },
  activeTagTextDark: { color: '#54f0c4' },
  connectorDark: { backgroundColor: '#2d3b38' },
  dotDark: { backgroundColor: '#2d3b38' },
  dotCurrentDark: { borderColor: '#1e382b' },
  stepCopyCurrentDark: { color: '#54f0c4' },
  doneBannerDark: { backgroundColor: '#1e382b' },
  doneBannerTextDark: { color: '#54f0c4' },
});