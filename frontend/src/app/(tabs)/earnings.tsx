import React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useAuth } from '../../context/AuthContext';

export default function EarningsScreen() {
  const { requests } = useRequests();
  const { user } = useAuth();

  // Only show orders YOU completed (accepted & marked completed)
  const completedByMe = requests
    .filter((r) => r.status === 'completed' && r.accepterId === user?.id)
    .map((r) => ({
      id: r.id,
      itemName: r.itemName,
      emoji: r.emoji,
      forWhom: r.requester.name.split(' ')[0],
      date: 'Completed',
      amount: r.deliveryFee,
    }));

  const totalEarned = completedByMe.reduce((sum, e) => sum + e.amount, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={completedByMe}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.top}>
              <Text style={styles.h2}>Earnings & history</Text>
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total earnings</Text>
              <Text style={styles.totalValue}>₹{totalEarned}</Text>
              {totalEarned > 0 && (
                <View style={styles.totalTrend}>
                  <Ionicons name="trending-up" size={14} color="#d3f1e3" />
                  <Text style={styles.totalTrendText}>From {completedByMe.length} completed {completedByMe.length === 1 ? 'delivery' : 'deliveries'}</Text>
                </View>
              )}
            </View>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Completed deliveries</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.emojiBox}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.itemName}</Text>
              <Text style={styles.itemSub}>
                For {item.forWhom} · {item.date}
              </Text>
            </View>
            <Text style={styles.amount}>+₹{item.amount}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No completed deliveries yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  top: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  h2: { fontSize: 22, fontWeight: '700', color: colors.ink },
  totalCard: {
    backgroundColor: colors.green,
    padding: 20,
    borderRadius: radius.xl,
    marginTop: 6,
  },
  totalLabel: { color: '#fff', fontSize: 12, opacity: 0.78 },
  totalValue: { color: '#fff', fontSize: 31, fontWeight: '800', marginVertical: 6, letterSpacing: -1 },
  totalTrend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  totalTrendText: { color: '#d3f1e3', fontSize: 11 },
  sectionHead: { marginTop: 25, marginBottom: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },
  emojiBox: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 19 },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  itemSub: { fontSize: 11, color: colors.muted, marginTop: 4 },
  amount: { fontSize: 14, fontWeight: '700', color: colors.green },
  emptyText: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 30 },
});