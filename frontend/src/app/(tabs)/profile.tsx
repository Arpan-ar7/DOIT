import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors as lightColors, darkThemeColors, radius, spacing } from '../../constants/theme';
import { CURRENT_USER } from '../../constants/mockData';
import { routes } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useRequests } from '../../context/RequestsContext';
import Avatar from '../../components/Avatar';

const MENU_ITEMS: { icon: keyof typeof Ionicons.glyphMap; label: string; route?: string }[] = [
  { icon: 'time-outline', label: 'Order history', route: routes.orderHistory() },
  { icon: 'wallet-outline', label: 'My earnings & history', route: routes.earnings() },
  { icon: 'settings-outline', label: 'Settings', route: routes.settings() },
  { icon: 'flag-outline', label: 'Report a problem', route: routes.report() },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const { requests } = useRequests();
  const colors = isDarkMode ? darkThemeColors : lightColors;
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  // ── Live stats from real Supabase data ─────────────────────────────
  // Deliveries = requests this user successfully completed as the deliverer
  const completedDeliveries = requests.filter(
    (r) => r.accepterId === user?.id && r.status === 'completed'
  );
  const deliveryCount = completedDeliveries.length;
  const totalEarned = completedDeliveries.reduce((sum, r) => sum + r.deliveryFee, 0);

  // Rating comes from profiles.average_rating via AuthContext (updated by
  // the backend whenever a rating is submitted — always in sync with DB)
  const rating = user?.rating ?? 0;

  const displayName = user?.name || CURRENT_USER.name;
  const initials = displayName.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView>
        <View style={styles.cover} />
        <View style={styles.main}>
          <Avatar initials={initials} imageUri={user?.photoUri} size={76} />
          <Text style={styles.name}>{displayName}</Text>
          {!!user?.username && <Text style={styles.username}>@{user.username}</Text>}
          {!!user?.hostel && (
            <View style={styles.hostelRow}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <Text style={styles.hostelText}>{user.hostel}</Text>
            </View>
          )}
          <View style={styles.verified}>
            <Ionicons name="checkmark-circle" size={14} color={colors.green} />
            <Text style={styles.verifiedText}>Verified student · Campus</Text>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{rating > 0 ? `${rating.toFixed(1)} ★` : '– ★'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{deliveryCount}</Text>
              <Text style={styles.statLabel}>Deliveries</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>₹{totalEarned}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
          </View>

          <View style={styles.verifiedCard}>
            <View style={styles.verifiedIcon}>
              <Ionicons name="shield-checkmark" size={18} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifiedCardTitle}>Campus verified</Text>
              <Text style={styles.verifiedCardSub}>Your college ID is verified</Text>
            </View>
          </View>

          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              style={styles.menuRow}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <Ionicons name={item.icon} size={19} color={colors.green} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ba6a0" />
            </Pressable>
          ))}

          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#c14b30" />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  cover: { height: 105, backgroundColor: isDark ? colors.mint : '#e0ecda' },
  main: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  name: { fontSize: 21, fontWeight: '700', color: colors.ink, marginTop: 10 },
  username: { fontSize: 12, color: colors.muted, marginTop: 2 },
  hostelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  hostelText: { fontSize: 12, color: colors.muted },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  verifiedText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 20 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 17, fontWeight: '700', color: colors.ink },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 3 },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
  },
  verifiedIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: isDark ? colors.mint : '#e3f3eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCardTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
  verifiedCardSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  menuLabel: { flex: 1, fontSize: 14, color: colors.ink },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: isDark ? '#3d241c' : '#fdf0ee',
    borderWidth: 1,
    borderColor: isDark ? '#8a3521' : '#f3c9c0',
  },
  logoutText: { color: isDark ? '#ff6b6b' : '#c14b30', fontSize: 14, fontWeight: '800' },
});