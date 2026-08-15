import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { CURRENT_USER, isExpired } from '../../constants/mockData';
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

  const total = request.itemBudget + request.deliveryFee;
  const alreadyAccepted = request.status !== 'requested';
  const isOwnRequest = request.requester.id === CURRENT_USER.id;
  const expired = isExpired(request.expiresAt);

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
              <Text style={styles.shop}>{request.shop}</Text>
            </View>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Maximum item cost</Text>
            <Text style={styles.amountValue}>₹{request.itemBudget}</Text>
          </View>
          <View style={[styles.amountRow, { marginTop: 0, paddingTop: 11 }]}>
            <Text style={styles.amountLabel}>Your delivery reward</Text>
            <Text style={styles.amountValueSmall}>+ ₹{request.deliveryFee}</Text>
          </View>
        </View>

        <View style={styles.detailList}>
          {!!request.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="chatbox-outline" size={17} color={colors.green} />
              <Text style={styles.detailText}>
                <Text style={styles.bold}>Note: </Text>
                {request.notes}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={17} color={colors.green} />
            <Text style={styles.detailText}>
              <Text style={styles.bold}>Expires in {countdown}</Text> · Accept only if you're
              already going out.
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={17} color={colors.green} />
            <Text style={styles.detailText}>
              Delivery to <Text style={styles.bold}>{request.requester.hostel}</Text>
            </Text>
          </View>
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

        {isOwnRequest ? (
          <Pressable style={styles.btnDanger} onPress={handleCancel}>
            <Text style={styles.btnDangerText}>Cancel this request</Text>
          </Pressable>
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
  hero: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 18,
    marginTop: 18,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emojiBox: {
    width: 61,
    height: 61,
    borderRadius: 18,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 29 },
  itemName: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 5 },
  shop: { fontSize: 12, color: colors.muted },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  amountLabel: { color: colors.muted, fontSize: 13 },
  amountValue: { fontSize: 18, fontWeight: '700', color: colors.greenDark },
  amountValueSmall: { fontSize: 15, fontWeight: '700', color: colors.greenDark },
  detailList: { marginTop: 15, gap: 12 },
  detailRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  detailText: { flex: 1, color: '#536366', fontSize: 13, lineHeight: 19 },
  bold: { fontWeight: '700', color: colors.ink },
  requester: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 15,
    marginTop: 15,
    backgroundColor: '#f4f8f4',
    borderRadius: 15,
  },
  requesterName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  requesterSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  btn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnOutline: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bcdcd0',
  },
  btnOutlineText: { color: colors.green, fontSize: 14, fontWeight: '800' },
  btnDanger: {
    backgroundColor: '#fdf0ee',
    borderWidth: 1,
    borderColor: '#f3c9c0',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  btnDangerText: { color: '#c14b30', fontSize: 14, fontWeight: '800' },
});