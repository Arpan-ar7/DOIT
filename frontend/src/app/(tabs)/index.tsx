import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, RequestCategory, isExpired } from '../../constants/mockData';
import { routes } from '../../constants/routes';
import RequestCard from '../../components/RequestCard';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  // CHANGED — added loading/error/refresh, since this data now comes over
  // the network and can genuinely fail or take a moment, unlike mock state.
  const { requests, goingTrips, loading, error, refresh } = useRequests();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RequestCategory | 'all'>('all');

  // CHANGED — CURRENT_USER.id -> the REAL logged-in user's id.
  const myRequests = requests.filter((r) => r.requester.id === user?.id);

  const activeRequests = useMemo(() => {
    return requests.filter((r) => {
      if (r.requester.id === user?.id) return false;
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
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={activeRequests}
        keyExtractor={(item) => item.id}
        // Pull-to-refresh — real, live data can change from other people's
        // devices at any time, so give a way to manually re-check.
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} colors={[colors.green]} />}
        ListHeaderComponent={
          <>
            <View style={styles.top}>
              <View>
                <Text style={styles.greeting}>Good afternoon, {firstName}</Text>
                <Text style={styles.h1}>What can you carry?</Text>
              </View>
              <Pressable style={styles.avatar} onPress={() => router.push(routes.profile())}>
                <Text style={styles.avatarText}>{initials}</Text>
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

            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <Pressable key={c.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setCategory(c.key)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.outingBanner} onPress={() => router.push(routes.goingOut())}>
              <View style={styles.outingIcon}><Ionicons name="location-outline" size={20} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.outingTitle}>Heading out today?</Text>
                <Text style={styles.outingSub}>
                  {goingTrips.length} {goingTrips.length === 1 ? 'student is' : 'students are'} heading out right now
                </Text>
              </View>
              <View style={styles.outingBtn}><Text style={styles.outingBtnText}>I'm going</Text></View>
            </Pressable>

            {myRequests.length > 0 && (
              <>
                <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Your requests</Text></View>
                <View style={styles.listPadding}>
                  {myRequests.map((r) => (
                    <RequestCard key={r.id} request={r} onPress={() => router.push(routes.requestDetails(r.id))} />
                  ))}
                </View>
              </>
            )}

            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Active requests near you</Text></View>
          </>
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
            <View style={styles.empty}>
              <Ionicons name="basket-outline" size={30} color={colors.muted} />
              <Text style={styles.emptyTitle}>
                {search || category !== 'all' ? 'No matching requests' : 'Nothing to help with right now'}
              </Text>
              <Text style={styles.emptySub}>
                {search || category !== 'all' ? 'Try a different search or category.' : 'New requests will show up here as campus mates post them.'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Pressable style={styles.fab} onPress={() => router.push(routes.createRequest())}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  top: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  h1: { fontSize: 25, fontWeight: '700', color: colors.ink, letterSpacing: -0.8 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: '#cde9dc', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', color: colors.greenDark, fontSize: 14 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fdf0ee', marginHorizontal: spacing.xl, marginTop: 8, padding: 10, borderRadius: 10 },
  errorText: { flex: 1, fontSize: 11, color: '#c14b30' },
  retryText: { fontSize: 11, fontWeight: '700', color: '#c14b30', textDecorationLine: 'underline' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.xl, marginTop: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 13, color: colors.ink, padding: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: spacing.xl, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  chipTextActive: { color: '#fff' },
  outingBanner: { backgroundColor: colors.green, borderRadius: radius.md, padding: 16, marginHorizontal: spacing.xl, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  outingIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  outingTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  outingSub: { color: '#fff', opacity: 0.8, fontSize: 12, marginTop: 3 },
  outingBtn: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  outingBtnText: { color: colors.greenDark, fontSize: 12, fontWeight: '800' },
  sectionHead: { paddingHorizontal: spacing.xl, marginTop: 25, marginBottom: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  listPadding: { paddingHorizontal: spacing.xl },
  empty: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 4 },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  fab: { position: 'absolute', right: 22, bottom: 22, width: 56, height: 56, borderRadius: 18, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', shadowColor: '#f47b44', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
});