import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Animated, Platform,
  ScrollView, RefreshControl, Image, ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { horror, spacing, radius } from '../../constants/theme';
import { CRAVING_LABELS, CravingPost } from '../../constants/mockData';
import { useCravings } from '../../context/CravingsContext';
import { useAuth } from '../../context/AuthContext';
import { routes } from '../../constants/routes';
import ScalePressable from '../../components/ScalePressable';

// @ts-ignore
import bannerImg from '../../assets/horror/banner.jpg';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getRandomAcceptLabel() {
  const labels = CRAVING_LABELS.accept;
  return labels[Math.floor(Math.random() * labels.length)];
}

// ── Flickering glow header ──
function FlickerTitle() {
  const glow = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.9, duration: 600, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.4, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.Text style={[styles.headerTitle, { opacity: glow }]}>
      {CRAVING_LABELS.headerTitle}
    </Animated.Text>
  );
}

// ── Craving Card ──
function CravingCard({ item, onAccept, onPress, isOwn }: {
  item: CravingPost;
  onAccept: () => void;
  onPress: () => void;
  isOwn: boolean;
}) {
  const slideIn = useRef(new Animated.Value(30)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const acceptLabelRef = useRef(getRandomAcceptLabel());

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }),
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const statusLabel = item.status === 'accepted'
    ? '🤝 Homie Found'
    : item.status === 'done'
    ? '✅ Craving Satisfied'
    : '🔴 Screaming for Help';

  return (
    <Animated.View style={{ transform: [{ translateY: slideIn }], opacity: fadeIn }}>
      <Pressable style={styles.card} onPress={onPress}>
        {/* Red glow strip at top */}
        <View style={styles.cardGlow} />

        <View style={styles.cardTop}>
          <View style={styles.cardAvatarWrap}>
            <Text style={styles.cardAvatarText}>{item.postedBy.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.postedBy.name}</Text>
            <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.cardWhat}>🍜 {item.what}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={13} color={horror.redGlow} />
            <Text style={styles.metaText}>{item.hostel}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>💰 ₹{item.price}</Text>
          </View>
        </View>

        {item.note ? (
          <Text style={styles.cardNote} numberOfLines={2}>📝 {item.note}</Text>
        ) : null}

        {item.status === 'open' && !isOwn && (
          <Pressable style={styles.acceptBtn} onPress={onAccept}>
            <Text style={styles.acceptBtnText}>{acceptLabelRef.current}</Text>
          </Pressable>
        )}

        {item.status === 'accepted' && (
          <View style={styles.acceptedBanner}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={horror.white} />
            <Text style={styles.acceptedText}>
              {isOwn ? 'Someone rescued you! Tap to chat 💬' : 'You\'re the hero! Tap to chat 💬'}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function CravingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { cravings, loading, refresh } = useCravings();
  const { acceptCraving } = useCravings();

  const feed = useMemo(() => {
    return cravings.filter((c) => c.status !== 'done').sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [cravings]);

  return (
    <ImageBackground source={bannerImg} style={styles.safe} resizeMode="cover">
      <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
          <View style={styles.headerRow}>
            <FlickerTitle />
            <MaterialCommunityIcons name="bat" size={32} color={horror.redBright} style={styles.batIcon} />
          </View>
          <Text style={styles.headerSub}>{CRAVING_LABELS.headerSub}</Text>
        </View>
      </SafeAreaView>

      <BlurView intensity={40} tint="dark" style={{ flex: 1 }}>
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={horror.redGlow} colors={[horror.redBright]} />
          }
          renderItem={({ item }) => (
            <View style={styles.listPad}>
              <CravingCard
                item={item}
                isOwn={item.postedBy.id === user?.id}
                onAccept={async () => {
                  await acceptCraving(item.id);
                }}
                onPress={() => router.push(routes.cravingDetail(item.id) as any)}
              />
            </View>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="bat" size={80} color={horror.redBright} style={styles.emptyBat} />
                <Text style={styles.emptyTitle}>{CRAVING_LABELS.emptyTitle}</Text>
                <Text style={styles.emptySub}>{CRAVING_LABELS.emptySub}</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 24) + 100 }}
          style={{ backgroundColor: 'transparent' }}
        />
      </BlurView>

      <ScalePressable
        style={[styles.fab, { bottom: Math.max(insets.bottom + 22, 22) + 80 }]}
        onPress={() => router.push(routes.createCraving() as any)}
      >
        <Ionicons name="flame-outline" size={22} color="#fff" />
        <Text style={styles.fabText}>{CRAVING_LABELS.fab}</Text>
      </ScalePressable>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: horror.bg },
  bannerBg: {
    width: '100%',
    minHeight: 120,
  },
  bannerOverlay: {
    backgroundColor: 'rgba(10,10,10,0.65)',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batIcon: { width: 40, height: 40, opacity: 0.85 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: horror.redBright,
    letterSpacing: -0.5,
    textShadowColor: horror.red,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  headerSub: {
    fontSize: 13,
    color: horror.offWhite,
    marginTop: 4,
    lineHeight: 18,
  },
  listPad: { paddingHorizontal: spacing.xl, marginBottom: 14 },
  card: {
    backgroundColor: horror.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: horror.border,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: horror.redBright,
    opacity: 0.8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: horror.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  cardName: { color: horror.textPrimary, fontWeight: '700', fontSize: 14 },
  cardTime: { color: horror.muted, fontSize: 11, marginTop: 1 },
  statusBadge: {
    backgroundColor: horror.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { color: horror.textSecondary, fontSize: 10, fontWeight: '700' },
  cardWhat: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: horror.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaText: { color: horror.textSecondary, fontSize: 12, fontWeight: '600' },
  cardNote: {
    color: horror.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    fontStyle: 'italic',
  },
  acceptBtn: {
    marginTop: 14,
    backgroundColor: horror.red,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: `0px 0px 20px ${horror.redGlow}40` },
      default: {
        shadowColor: horror.redGlow,
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      },
    }),
  },
  acceptBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.3 },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: `${horror.redDark}40`,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${horror.red}50`,
  },
  acceptedText: { color: horror.white, fontSize: 12, fontWeight: '700', flex: 1 },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyBat: { width: 80, height: 80, opacity: 0.7, marginBottom: 8 },
  emptyTitle: { color: horror.white, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySub: { color: horror.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  fab: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: horror.red,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...Platform.select({
      web: { boxShadow: `0px 4px 24px ${horror.redGlow}50` },
      default: {
        shadowColor: horror.redGlow,
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
      },
    }),
  },
  fabText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
