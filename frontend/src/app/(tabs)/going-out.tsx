import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as lightColors, darkThemeColors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ScreenHeader from '../../components/ScreenHeader';
import Avatar from '../../components/Avatar';

type PeerProfile = {
  id: string;
  full_name: string;
  profile_picture: string | null;
  average_rating?: number;
  updated_at?: string;
};

export default function GoingOutScreen() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? darkThemeColors : lightColors;
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [isOut, setIsOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [peers, setPeers] = useState<PeerProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch current user status and all peers who are currently outside
  const fetchGoingOutData = useCallback(async () => {
    try {
      if (user?.id) {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('is_going_out')
          .eq('id', user.id)
          .single();
        if (myProfile) {
          setIsOut(Boolean(myProfile.is_going_out));
        }
      }

      // Fetch all students who are currently marked as is_going_out = true
      const { data: outsidePeers, error } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture, average_rating, updated_at')
        .eq('is_going_out', true);

      if (!error && outsidePeers) {
        setPeers(outsidePeers);
      }
    } catch (_) {
      // Gracefully handle any network hiccup
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGoingOutData();

    // Listen for realtime updates to any profiles going out status
    const channelName = `public:going_out_screen:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new && (payload.new as any).id === user?.id && (payload.new as any).is_going_out !== undefined) {
            setIsOut(Boolean((payload.new as any).is_going_out));
          }
          fetchGoingOutData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGoingOutData, user?.id]);

  async function handleToggleGoingOut() {
    if (!user?.id || toggling) return;
    const nextState = !isOut;
    setToggling(true);
    setIsOut(nextState);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_going_out: nextState, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        setIsOut(!nextState);
      } else {
        await fetchGoingOutData();
      }
    } catch (_) {
      setIsOut(!nextState);
    } finally {
      setToggling(false);
    }
  }

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGoingOutData();
  }, [fetchGoingOutData]);

  const otherPeers = peers.filter((p) => p.id !== user?.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Going Out" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.green]} />}
      >
        {/* User's own status banner */}
        {!isOut ? (
          <View style={styles.notOutCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="navigate-circle-outline" size={44} color={colors.green} />
            </View>
            <Text style={styles.cardTitle}>Heading somewhere?</Text>
            <Text style={styles.cardSub}>
              Let your hostel mates know you're outside so they can request quick pick-ups from nearby shops!
            </Text>
            <Pressable style={styles.btn} onPress={handleToggleGoingOut} disabled={toggling}>
              <Ionicons name="walk-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>{toggling ? 'Updating...' : 'I am going out'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.outCard}>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.statusText}>You are marked as OUT</Text>
            </View>
            <Text style={styles.outSub}>
              Other students can see that you're outside and can send you delivery requests to carry items back.
            </Text>
            <Pressable style={styles.backBtn} onPress={handleToggleGoingOut} disabled={toggling}>
              <Ionicons name="return-down-back-outline" size={16} color={colors.green} />
              <Text style={styles.backBtnText}>{toggling ? 'Updating...' : "I'm back inside"}</Text>
            </Pressable>
          </View>
        )}

        {/* List of Peers who are outside */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>
            Peers outside right now ({peers.length})
          </Text>
          <Text style={styles.sectionSubtitle}>
            Students currently available on campus or nearby markets
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={colors.green} />
        ) : peers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={36} color={colors.muted} />
            <Text style={styles.emptyTitle}>No one is marked outside</Text>
            <Text style={styles.emptySub}>
              Be the first to let your campus know you're heading out!
            </Text>
          </View>
        ) : (
          <View style={styles.peerList}>
            {peers.map((peer) => {
              const isMe = peer.id === user?.id;
              const name = isMe ? `${peer.full_name} (You)` : peer.full_name;
              const initials = peer.full_name
                ? peer.full_name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                : 'U';

              return (
                <View key={peer.id} style={styles.peerCard}>
                  <Avatar initials={initials} imageUri={peer.profile_picture} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.peerName} numberOfLines={1}>{name}</Text>
                    <View style={styles.peerStatusRow}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.peerStatusText}>Outside & available</Text>
                    </View>
                  </View>
                  <View style={styles.activeTag}>
                    <Ionicons name="walk" size={14} color={colors.green} />
                    <Text style={styles.activeTagText}>Out</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 60, paddingTop: 10 },

  // Not-out card
  notOutCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDark ? '#162b21' : colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  cardSub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Out card
  outCard: {
    backgroundColor: colors.green,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 10,
  },
  statusText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  outSub: { color: '#fff', opacity: 0.85, fontSize: 12, textAlign: 'center', lineHeight: 17, marginBottom: 18 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  backBtnText: { color: colors.green, fontSize: 13, fontWeight: '800' },

  // Section
  sectionHead: { marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  sectionSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },

  peerList: { gap: 10 },
  peerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
  },
  peerName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  peerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#27ae60' },
  peerStatusText: { fontSize: 11, color: colors.muted },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? '#162b21' : '#eefcf6',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activeTagText: { fontSize: 11, fontWeight: '700', color: colors.green },

  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});