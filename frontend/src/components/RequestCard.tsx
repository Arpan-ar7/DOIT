import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import { DeliveryRequest, isExpired, STATUS_LABELS } from '../constants/mockData';
import { minutesLeftLabel } from '../utils/time';

type Props = {
  request: DeliveryRequest;
  onPress: () => void;
};

export default function RequestCard({ request, onPress }: Props) {
  const isPending = request.status === 'pending';
  // Expiry only means anything while nothing has happened yet. Once
  // accepted/in_progress/completed/cancelled, we show the REAL status
  // instead — otherwise a completed order from yesterday would still show
  // "Expired" forever, since its old deadline has obviously passed.
  const isExpiredPending = isPending && isExpired(request.expiresAt);

  // Work out what the little tag in the bottom-right of the card should say,
  // and which color scheme it should use.
  let tagLabel: string;
  let tagVariant: 'default' | 'expired' | 'cancelled' | 'completed' | 'active';

  if (isExpiredPending) {
    tagLabel = 'Expired';
    tagVariant = 'expired';
  } else if (isPending) {
    tagLabel = minutesLeftLabel(request.expiresAt);
    tagVariant = 'default';
  } else if (request.status === 'cancelled') {
    tagLabel = STATUS_LABELS.cancelled;
    tagVariant = 'cancelled';
  } else if (request.status === 'completed') {
    tagLabel = STATUS_LABELS.completed;
    tagVariant = 'completed';
  } else {
    // accepted / in_progress
    tagLabel = STATUS_LABELS[request.status];
    tagVariant = 'active';
  }

  // Dim the whole card for things that are "over" in a negative sense
  // (expired or cancelled) — but NOT for accepted/in_progress/completed,
  // since those are legitimately alive or successfully finished.
  const isDimmed = isExpiredPending || request.status === 'cancelled';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, isDimmed && styles.cardDimmed]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{request.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {request.itemName}
          </Text>
          <Text style={styles.subtext} numberOfLines={1}>
            {request.shop || 'No shop specified'}
          </Text>
        </View>
        <Text style={styles.price}>₹{request.itemBudget}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.person}>
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>{request.requester.initials}</Text>
          </View>
          <Text style={styles.personText} numberOfLines={1}>
            {request.requester.name} · {request.requester.hostel}
          </Text>
        </View>
        <View style={[styles.tag, tagStyles[tagVariant]]}>
          <Text style={[styles.tagText, tagTextStyles[tagVariant]]}>{tagLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// Separate style maps (instead of one giant switch inline) so each variant's
// background + text color are easy to scan and adjust independently.
const tagStyles = StyleSheet.create({
  default: { backgroundColor: '#f2f4ee' },
  expired: { backgroundColor: '#f3e9e6' },
  cancelled: { backgroundColor: '#fdf0ee' },
  completed: { backgroundColor: '#dcf2e8' },
  active: { backgroundColor: '#dcf2e8' },
});

const tagTextStyles = StyleSheet.create({
  default: { color: '#627168' },
  expired: { color: '#a05a48' },
  cancelled: { color: '#c14b30' },
  completed: { color: '#0e5545' },
  active: { color: '#166b57' },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 11,
    ...shadow,
    shadowOpacity: 0.025,
  },
  cardPressed: { transform: [{ scale: 0.985 }] },
  cardDimmed: { opacity: 0.55 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emojiBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 23 },
  info: { flex: 1, marginRight: 8 },
  title: { fontSize: 16, fontWeight: '600', color: colors.ink, marginBottom: 4 },
  subtext: { fontSize: 12, color: colors.muted },
  price: { fontWeight: '800', fontSize: 15, color: colors.greenDark },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eff1ec',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  person: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  miniAvatar: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#f7d5c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 9, fontWeight: '800', color: '#994327' },
  personText: { fontSize: 12, color: '#526266', flexShrink: 1 },
  tag: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '700' },
});