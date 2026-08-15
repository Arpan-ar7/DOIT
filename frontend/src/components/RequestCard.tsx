import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import { DeliveryRequest, isExpired } from '../constants/mockData';
import { minutesLeftLabel } from '../utils/time';

type Props = {
  request: DeliveryRequest;
  onPress: () => void;
};

export default function RequestCard({ request, onPress }: Props) {
  const expired = isExpired(request.expiresAt);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed, expired && styles.cardExpired]}
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
            {request.shop}
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
        <View style={[styles.tag, expired && styles.tagExpired]}>
          <Text style={[styles.tagText, expired && styles.tagTextExpired]}>
            {expired ? 'Expired' : minutesLeftLabel(request.expiresAt)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

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
  cardExpired: { opacity: 0.55 },
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
  tag: { backgroundColor: '#f2f4ee', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  tagExpired: { backgroundColor: '#f3e9e6' },
  tagText: { fontSize: 11, fontWeight: '700', color: '#627168' },
  tagTextExpired: { color: '#a05a48' },
});