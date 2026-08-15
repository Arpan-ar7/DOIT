import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { RequestStatus } from '../../constants/mockData';
import { routes } from '../../constants/routes';
import ScreenHeader from '../../components/ScreenHeader';

const STEPS: { key: RequestStatus; label: string; icon: keyof typeof Ionicons.glyphMap; doneCopy: string; pendingCopy: string }[] = [
  { key: 'requested', label: 'Requested', icon: 'checkmark', doneCopy: 'Request was posted', pendingCopy: 'Waiting to be posted' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark', doneCopy: 'You accepted this request', pendingCopy: 'Waiting for someone to accept' },
  { key: 'shopping', label: 'Shopping', icon: 'bag-handle-outline', doneCopy: 'Item was picked up', pendingCopy: 'Pick up the item and update status' },
  { key: 'returning', label: 'Returning', icon: 'bicycle-outline', doneCopy: 'Headed back to campus', pendingCopy: 'Head back to campus' },
  { key: 'delivered', label: 'Delivered', icon: 'cube-outline', doneCopy: 'Handed off to requester', pendingCopy: 'Meet at the hostel gate' },
  { key: 'completed', label: 'Completed', icon: 'sparkles-outline', doneCopy: 'Payment & rating confirmed', pendingCopy: 'Payment and rating confirmed' },
];

const NEXT_ACTION_LABEL: Partial<Record<RequestStatus, string>> = {
  accepted: 'Mark as shopping',
  shopping: 'Mark as returning',
  returning: 'Mark as delivered',
  delivered: 'Mark as completed',
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

  const currentIndex = STEPS.findIndex((s) => s.key === request.status);
  const total = request.itemBudget + request.deliveryFee;
  const nextActionLabel = NEXT_ACTION_LABEL[request.status];

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
            <Text style={styles.activeTagText}>
              {request.status === 'completed' ? 'Done' : 'Active'}
            </Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          {STEPS.map((step, index) => {
            const isDone = index < currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <View
                key={step.key}
                style={[styles.stepRow, index === STEPS.length - 1 && { paddingBottom: 0 }]}
              >
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

        {request.status === 'completed' && (
          <View style={styles.doneBanner}>
            <Ionicons name="sparkles" size={18} color={colors.green} />
            <Text style={styles.doneBannerText}>
              Delivery complete — ₹{request.deliveryFee} added to your earnings.
            </Text>
          </View>
        )}

        {request.status === 'completed' && !request.rating && (
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
        {request.status === 'completed' && !!request.rating && (
          <Text style={styles.ratedText}>You rated this delivery {request.rating} ★</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 15,
    marginTop: 12,
  },
  emojiBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  subtext: { fontSize: 12, color: colors.muted, marginTop: 3 },
  activeTag: { backgroundColor: colors.mint, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  activeTagText: { fontSize: 11, fontWeight: '700', color: colors.green },
  timelineCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 18,
    marginTop: 18,
  },
  stepRow: { flexDirection: 'row', gap: 13, paddingBottom: 22, position: 'relative' },
  connector: {
    position: 'absolute',
    left: 15,
    top: 34,
    bottom: 0,
    width: 2,
    backgroundColor: '#e1e8e2',
  },
  connectorDone: { backgroundColor: colors.mint },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#edf0ec',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotDone: { backgroundColor: colors.green },
  dotCurrent: { backgroundColor: colors.green, borderWidth: 5, borderColor: '#dff1e8' },
  stepLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  stepCopy: { fontSize: 11, color: colors.muted },
  stepCopyCurrent: { color: colors.green, fontWeight: '700' },
  btn: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.mint,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  doneBannerText: { flex: 1, fontSize: 12, color: colors.greenDark, fontWeight: '600' },
  rateCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    alignItems: 'center',
  },
  rateTitle: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  starRow: { flexDirection: 'row', gap: 8 },
  ratedText: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 14 },
});