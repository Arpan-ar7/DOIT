import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isExpired, CATEGORIES } from '../../constants/mockData';
import { useCountdown } from '../../hooks/useCountdown';
import { routes } from '../../constants/routes';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { getRequestById, acceptRequest, cancelRequest } = useRequests();
  const request = getRequestById(id);
  const countdown = useCountdown(request?.expiresAt ?? new Date().toISOString());

  // Real network calls now — need their own loading + error state.
  const [accepting, setAccepting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!request) {
    return (
      <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.notFound}>This request no longer exists.</Text>
          <Pressable style={[styles.btnOutline, isDarkMode && styles.btnOutlineDark]} onPress={() => router.back()}>
            <Text style={styles.btnOutlineText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const alreadyAccepted = request.status !== 'pending';
  // CHANGED — CURRENT_USER.id -> real user id.
  const isOwnRequest = request.requester.id === user?.id;
  const expired = request.status === 'pending' && isExpired(request.expiresAt);
  const categoryLabel = CATEGORIES.find((c) => c.key === request.category)?.label ?? 'Other';

  async function handleAccept() {
    if (!request) return;
    setActionError('');
    setAccepting(true);
    const result = await acceptRequest(request.id);
    setAccepting(false);
    if (!result.success) {
      setActionError(result.error ?? 'Could not accept request.');
      return;
    }
    router.replace(routes.orderStatus(request.id));
  }

  async function handleCancel() {
    if (!request) return;
    setActionError('');
    setCancelling(true);
    const result = await cancelRequest(request.id);
    setCancelling(false);
    if (!result.success) {
      setActionError(result.error ?? 'Could not cancel request.');
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
      <ScreenHeader title="Request details" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.hero, isDarkMode && styles.cardDark]}>
          <View style={styles.heroTop}>
            <View style={styles.emojiBox}><Text style={styles.emoji}>{request.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, isDarkMode && styles.textWhite]}>{request.itemName}</Text>
              <View style={[styles.categoryTag, isDarkMode && styles.categoryTagDark]}><Text style={[styles.categoryTagText, isDarkMode && styles.categoryTagTextDark]}>{categoryLabel}</Text></View>
              {!!request.shop && <Text style={[styles.shop, isDarkMode && styles.textMuted]}>{request.shop}</Text>}
            </View>
          </View>
        </View>

        <View style={[styles.priceCard, isDarkMode && styles.cardDark]}>
          <View style={[styles.priceRow, isDarkMode && styles.borderDark]}>
            <Text style={[styles.priceLabel, isDarkMode && styles.textMuted]}>Approx item price</Text>
            <Text style={[styles.priceValue, isDarkMode && styles.priceDark]}>₹{request.itemBudget}</Text>
          </View>
          <View style={[styles.priceRow, styles.priceRowLast]}>
            <Text style={[styles.priceLabel, isDarkMode && styles.textMuted]}>Delivery fee</Text>
            <Text style={[styles.priceValueSmall, isDarkMode && styles.priceDark]}>+ ₹{request.deliveryFee}</Text>
          </View>
        </View>

        {request.status === 'pending' && (
          <View style={styles.expiryRow}>
            <Ionicons name="time-outline" size={15} color={isDarkMode ? '#8a9e9f' : colors.muted} />
            <Text style={[styles.expiryText, isDarkMode && styles.textMuted]}>Expires in {countdown} · Accept only if you're already going out</Text>
          </View>
        )}

        {!!request.notes && (
          <View style={[styles.infoBlock, isDarkMode && styles.cardDark]}>
            <View style={styles.infoBlockHeader}><Ionicons name="chatbox-outline" size={16} color={isDarkMode ? '#54f0c4' : colors.green} /><Text style={[styles.infoBlockTitle, isDarkMode && styles.textWhite]}>Notes</Text></View>
            <Text style={[styles.infoBlockText, isDarkMode && styles.textMuted]}>{request.notes}</Text>
          </View>
        )}

        <View style={[styles.infoBlock, isDarkMode && styles.cardDark]}>
          <View style={styles.infoBlockHeader}><Ionicons name="location-outline" size={16} color={isDarkMode ? '#54f0c4' : colors.green} /><Text style={[styles.infoBlockTitle, isDarkMode && styles.textWhite]}>Delivery location</Text></View>
          <Text style={[styles.infoBlockText, isDarkMode && styles.textMuted]}>{request.deliveryLocation}</Text>
        </View>

        <View style={[styles.requester, isDarkMode && styles.requesterDark]}>
          <Avatar initials={request.requester.initials} imageUri={request.requester.photoUri} size={39} backgroundColor={isDarkMode ? '#3b2520' : '#f6d8ca'} textColor={isDarkMode ? '#e08369' : '#a04d2d'} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.requesterName, isDarkMode && styles.textWhite]}>{request.requester.name}</Text>
            <Text style={[styles.requesterSub, isDarkMode && styles.textMuted]}>★ {request.requester.rating.toFixed(1)} · {request.requester.completedRequests} ratings</Text>
          </View>
          <Ionicons name="shield-checkmark" size={19} color={isDarkMode ? '#54f0c4' : colors.green} />
        </View>

        {!!actionError && <Text style={styles.errorText}>{actionError}</Text>}

        {isOwnRequest ? (
          request.status === 'pending' ? (
            <Pressable style={[styles.btnDanger, isDarkMode && styles.btnDangerDark]} onPress={handleCancel} disabled={cancelling}>
              <Text style={[styles.btnDangerText, isDarkMode && {color: '#e74c3c'}]}>{cancelling ? 'Cancelling...' : 'Cancel this request'}</Text>
            </Pressable>
          ) : request.status === 'cancelled' ? (
            <View style={[styles.cancelledNotice, isDarkMode && styles.cancelledNoticeDark]}>
              <Ionicons name="close-circle" size={16} color="#c14b30" />
              <Text style={[styles.cancelledNoticeText, isDarkMode && {color: '#e74c3c'}]}>You cancelled this request.</Text>
            </View>
          ) : (
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
              style={[styles.btn, (alreadyAccepted || accepting) && styles.btnDisabled]}
              onPress={handleAccept}
              disabled={alreadyAccepted || accepting}
            >
              <Text style={styles.btnText}>
                {accepting ? 'Accepting...' : alreadyAccepted ? 'Already accepted' : `Accept request · Earn ₹${request.deliveryFee}`}
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
  errorText: { color: '#c14b30', fontSize: 12, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  btn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnOutline: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#bcdcd0' },
  btnOutlineText: { color: colors.green, fontSize: 14, fontWeight: '800' },
  btnDanger: { backgroundColor: '#fdf0ee', borderWidth: 1, borderColor: '#f3c9c0', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnDangerText: { color: '#c14b30', fontSize: 14, fontWeight: '800' },
  cancelledNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fdf0ee', borderRadius: 14, paddingVertical: 15, marginTop: 18 },
  cancelledNoticeText: { color: '#c14b30', fontSize: 13, fontWeight: '700' },

  // Dark mode
  safeDark: { backgroundColor: colors.ink },
  textWhite: { color: '#f8f8f8' },
  textMuted: { color: '#8a9e9f' },
  cardDark: { backgroundColor: '#1a2221', borderColor: '#2d3b38' },
  categoryTagDark: { backgroundColor: '#1e382b' },
  categoryTagTextDark: { color: '#54f0c4' },
  borderDark: { borderBottomColor: '#2d3b38' },
  priceDark: { color: '#54f0c4' },
  requesterDark: { backgroundColor: '#14251f' },
  btnOutlineDark: { backgroundColor: 'transparent', borderColor: '#2d3b38' },
  btnDangerDark: { backgroundColor: '#2a1a1a', borderColor: '#4a2a2a' },
  cancelledNoticeDark: { backgroundColor: '#2a1a1a', borderColor: '#2a1a1a' },
});