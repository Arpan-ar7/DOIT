import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, StatusBar as RNStatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function GoingOutScreen() {
  const [isOut, setIsOut] = useState(false);
  const [since, setSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if user's is_going_out status is true in profiles table
  const checkStatus = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (uid) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_going_out')
          .eq('id', uid)
          .single();
        if (!error && data) {
          setIsOut(Boolean(data.is_going_out));
        }
      }
    } catch (_) {
      // ignore errors
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkStatus();

    // Listen for realtime updates to current user profile
    const channel = supabase
      .channel('public:profiles_going_out_screen')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async (payload) => {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user.id;
          if (uid && payload.new && (payload.new as any).id === uid && (payload.new as any).is_going_out !== undefined) {
            setIsOut(Boolean((payload.new as any).is_going_out));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkStatus]);

  async function handleGoingOut() {
    setIsOut(true);
    setSince(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) {
      await supabase.from('profiles').update({ is_going_out: true }).eq('id', uid);
    }
  }

  async function handleBack() {
    setIsOut(false);
    setSince(null);
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) {
      await supabase.from('profiles').update({ is_going_out: false }).eq('id', uid);
    }
  }

  if (loading) return <View style={styles.safe} />;

  return (
    <View style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.h2}>Going Out</Text>

        {!isOut ? (
          // ── Not out yet ──
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="navigate-circle-outline" size={48} color={colors.green} />
            </View>
            <Text style={styles.cardTitle}>Heading somewhere?</Text>
            <Text style={styles.cardSub}>
              Let others know you're available to pick up items while you're out.
            </Text>
            <Pressable style={styles.btn} onPress={handleGoingOut}>
              <Ionicons name="walk-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>I am going out</Text>
            </Pressable>
          </View>
        ) : (
          // ── Currently out ──
          <View style={styles.outCard}>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.statusText}>You are currently out</Text>
            </View>
            <Text style={styles.sinceText}>Since {since}</Text>
            <Text style={styles.outSub}>
              Your status will automatically reset in 12 hours. Others can see that you're available to carry items.
            </Text>
            <Pressable style={styles.backBtn} onPress={handleBack}>
              <Ionicons name="return-down-back-outline" size={16} color={colors.green} />
              <Text style={styles.backBtnText}>I'm back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 8 : 52,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  h2: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 24 },

  // ── Not-out card ──
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  cardSub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19, marginBottom: 22 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // ── Out card ──
  outCard: {
    backgroundColor: colors.green,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sinceText: { color: '#fff', opacity: 0.85, fontSize: 13, marginBottom: 10 },
  outSub: { color: '#fff', opacity: 0.7, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 22 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  backBtnText: { color: colors.green, fontSize: 14, fontWeight: '800' },
});