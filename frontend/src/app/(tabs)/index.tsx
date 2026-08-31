import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator, RefreshControl, Platform, ScrollView } from 'react-native';
import ScalePressable from '../../components/ScalePressable';
import AnimatedEmptyState from '../../components/AnimatedEmptyState';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors as lightColors, darkThemeColors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { CATEGORIES, RequestCategory, isExpired } from '../../constants/mockData';
import { routes } from '../../constants/routes';
import RequestCard from '../../components/RequestCard';
import Avatar from '../../components/Avatar';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { requests, loading, error, refresh } = useRequests();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RequestCategory | 'all'>('all');

  const { isDarkMode, toggleDarkMode } = useTheme();
  const colors = isDarkMode ? darkThemeColors : lightColors;
  const styles = useMemo(() => getStyles(colors), [colors]);

  // ── Dynamic Going-out State (Synced via Supabase profiles table) ──
  const [isOut, setIsOut] = useState(false);
  const [goingOutCount, setGoingOutCount] = useState(0);

  const fetchGoingOutCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_going_out', true);
      if (!error && typeof count === 'number') {
        setGoingOutCount(count);
      }
    } catch (_) {
      // Column may not exist or network error — gracefully ignore
    }
  }, []);

  const checkGoingOutStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_going_out')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setIsOut(Boolean(data.is_going_out));
      }
    } catch (_) {}
  }, [user?.id]);

  useEffect(() => {
    fetchGoingOutCount();
    if (user?.id) {
      checkGoingOutStatus();
    }

    // Realtime channel to dynamically sync going-out count and status across all users
    const channelName = `public:profiles_is_going_out:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          fetchGoingOutCount();
          if (payload.new && (payload.new as any).id === user?.id && (payload.new as any).is_going_out !== undefined) {
            setIsOut(Boolean((payload.new as any).is_going_out));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchGoingOutCount, checkGoingOutStatus]);

  async function toggleGoingOut() {
    if (!user?.id) return;
    const nextState = !isOut;
    // Optimistic UI update
    setIsOut(nextState);
    setGoingOutCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_going_out: nextState, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) {
        // Revert on failure
        setIsOut(!nextState);
        await fetchGoingOutCount();
      }
    } catch (_) {
      setIsOut(!nextState);
      await fetchGoingOutCount();
    }
  }

  const handleRefresh = useCallback(async () => {
    await Promise.all([refresh(), fetchGoingOutCount(), checkGoingOutStatus()]);
  }, [refresh, fetchGoingOutCount, checkGoingOutStatus]);

  // CHANGED — CURRENT_USER.id -> the REAL logged-in user's id.
  const myRequests = requests.filter((r) => r.requester.id === user?.id);

  const activeRequests = useMemo(() => {
    return requests.filter((r) => {
      if (r.requester.id === user?.id) return false;
      if (r.isLateNightCraving) return false;
      if (r.status !== 'pending') return false;
      if (isExpired(r.expiresAt)) return false;
      if (category !== 'all' && r.category !== category) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!r.itemName.toLowerCase().includes(q) && !r.shop.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [requests, search, category, user?.id]);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initials = user?.name ? user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'S';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={activeRequests}
        keyExtractor={(item) => item.id}
        // Pull-to-refresh — real, live data can change from other people's
        // devices at any time, so give a way to manually re-check.
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[colors.green]} />}
        ListHeaderComponent={
          <>
            <View style={styles.top}>
              <View>
                <Text style={styles.greeting}>Hey, {firstName} 👋</Text>
                <Text style={styles.h1}>What can you carry?</Text>
              </View>
              <Pressable onPress={() => router.push(routes.profile())}>
                <Avatar initials={initials} imageUri={user?.photoUri} size={42} />
              </Pressable>
            </View>

            {!!error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color="#c14b30" />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={refresh}><Text style={styles.retryText}>Retry</Text></Pressable>
              </View>
            )}

            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={colors.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search item or shop..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={colors.muted}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.muted} />
                </Pressable>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <ScalePressable key={c.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setCategory(c.key)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                  </ScalePressable>
                );
              })}
            </ScrollView>

            <Pressable style={[styles.outingBanner, isOut && styles.outingBannerActive]} onPress={toggleGoingOut}>
              {/* Top row: icon + text + button */}
              <View style={styles.outingTopRow}>
                <View style={styles.outingIcon}>
                  <Ionicons name={isOut ? 'checkmark-circle' : 'walk-outline'} size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.outingTitle}>{isOut ? 'You are currently out' : 'Going out?'}</Text>
                  <Text style={styles.outingSub}>
                    {isOut ? 'Tap to mark yourself as back' : 'Tap to let others know you\'re heading out'}
                  </Text>
                </View>
                <View style={styles.outingBtn}>
                  <Text style={styles.outingBtnText}>{isOut ? "I'm back" : "I'm going out"}</Text>
                </View>
              </View>
              {/* Bottom count bar */}
              <Pressable
                style={styles.outingCountBar}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(routes.goingOut());
                }}
              >
                <Ionicons name="people" size={13} color="#fff" style={{ opacity: 0.85 }} />
                <Text style={styles.outingCountBarText}>
                  {goingOutCount > 0 ? `${goingOutCount} people outside right now · View peers →` : 'No one is outside right now · View →'}
                </Text>
              </Pressable>
            </Pressable>

            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Active requests near you</Text></View>
          </>
        }
        ListFooterComponent={
          myRequests.length > 0 ? (
            <View style={{ paddingBottom: 20 }}>
              <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your requests</Text></View>
              <View style={styles.listPadding}>
                {myRequests.slice(0, 2).map((r) => (
                  <RequestCard key={r.id} request={r} onPress={() => router.push(routes.requestDetails(r.id))} />
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.listPadding}>
            <RequestCard request={item} onPress={() => router.push(routes.requestDetails(item.id))} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 30 }} color={colors.green} />
          ) : (
            <AnimatedEmptyState
              icon="basket-outline"
              title={search || category !== 'all' ? 'No matching requests' : 'Nothing to help with right now'}
              subtitle={search || category !== 'all' ? 'Try a different search or category.' : 'New requests will show up here as campus mates post them.'}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 80 }}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
      />

      <ScalePressable style={[styles.fab, { bottom: Math.max(insets.bottom + 22, 22) + 80 }]} onPress={() => router.push(routes.createRequest())}>
        <Ionicons name="add" size={26} color="#fff" />
      </ScalePressable>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  top: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  h1: { fontSize: 25, fontWeight: '700', color: colors.ink, letterSpacing: -0.8 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#cde9dc', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', color: colors.greenDark, fontSize: 14 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fdf0ee', marginHorizontal: spacing.xl, marginTop: 8, padding: 10, borderRadius: 10 },
  errorText: { flex: 1, fontSize: 11, color: '#c14b30' },
  retryText: { fontSize: 11, fontWeight: '700', color: '#c14b30', textDecorationLine: 'underline' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.xl, marginTop: 4, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink, padding: 0 },
  chipRow: { gap: 8, paddingHorizontal: spacing.xl, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  chipTextActive: { color: '#fff' },
  outingBanner: { backgroundColor: colors.green, borderRadius: radius.md, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 0, marginHorizontal: spacing.xl, marginTop: 14, flexDirection: 'column', gap: 0 },
  outingBannerActive: { backgroundColor: '#2d8a62' },
  outingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12 },
  outingIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  outingTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  outingSub: { color: '#fff', opacity: 0.8, fontSize: 12, marginTop: 3 },
  outingCountBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.18)', borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 9 },
  outingCountBarText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  outingBtn: { backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  outingBtnText: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  sectionHead: { paddingHorizontal: spacing.xl, marginTop: 25, marginBottom: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  listPadding: { paddingHorizontal: spacing.xl },
  empty: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 7px 12px rgba(244, 123, 68, 0.35)' },
      default: { shadowColor: '#f47b44', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 }
    })
  },
});