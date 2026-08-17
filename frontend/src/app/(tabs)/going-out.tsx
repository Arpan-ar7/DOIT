import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';

export default function GoingOutScreen() {
  const { goingTrips, announceTrip } = useRequests();
  const [destination, setDestination] = useState('');
  const [leavingAt, setLeavingAt] = useState('');
  const [backBy, setBackBy] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const isValid = destination.trim().length > 0 && leavingAt.trim().length > 0 && backBy.trim().length > 0;

  function handleAnnounce() {
    if (!isValid) return;
    announceTrip({ destination: destination.trim(), leavingAt: leavingAt.trim(), backBy: backBy.trim() });
    setDestination('');
    setLeavingAt('');
    setBackBy('');
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2500);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h2}>I'm going outside</Text>

        <View style={styles.hero}>
          <Ionicons name="navigate-circle-outline" size={27} color="#fff" />
          <Text style={styles.heroTitle}>Make your trip count</Text>
          <Text style={styles.heroSub}>
            Share where you're headed and help someone get what they need along the way.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Where are you going?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. City Centre Mall"
            value={destination}
            onChangeText={setDestination}
          />
          <Text style={styles.label}>Leaving campus around</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2:30 PM · Today"
            value={leavingAt}
            onChangeText={setLeavingAt}
          />
          <Text style={styles.label}>I'll be back by</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 4:30 PM · Today"
            value={backBy}
            onChangeText={setBackBy}
          />
          <Pressable style={[styles.btn, !isValid && styles.btnDisabled]} onPress={handleAnnounce} disabled={!isValid}>
            <Text style={styles.btnText}>Announce my trip</Text>
          </Pressable>
          {confirmed && (
            <Text style={styles.confirmedText}>
              You're announced! Relevant requests will appear for you.
            </Text>
          )}
        </View>

        {/* PRIVACY CHANGE — individual trip cards (who's going where, when)
            are gone. Only a total count is shown, with zero identifying
            info. This protects students from broadcasting "I'm off campus
            right now" details to everyone browsing the app. */}
        <View style={styles.countCard}>
          <View style={styles.countIcon}>
            <Ionicons name="people-outline" size={22} color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.countNumber}>{goingTrips.length}</Text>
            <Text style={styles.countLabel}>
              {goingTrips.length === 1 ? 'student is' : 'students are'} currently going out
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 40 },
  h2: { fontSize: 22, fontWeight: '700', color: colors.ink },
  hero: {
    backgroundColor: colors.green,
    padding: 20,
    borderRadius: radius.xl,
    marginTop: 18,
    marginBottom: 18,
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 13 },
  heroSub: { color: '#fff', opacity: 0.8, fontSize: 12, marginTop: 6, lineHeight: 18 },
  formCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 16,
  },
  label: { fontSize: 12, color: '#516164', fontWeight: '700', marginTop: 15, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e7e0',
    backgroundColor: '#fafbf8',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
  },
  btn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  confirmedText: { color: colors.green, fontSize: 12, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  // Replaces the old "Students going out now" list + section header entirely.
  countCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 18,
    marginTop: 22,
  },
  countIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNumber: { fontSize: 24, fontWeight: '800', color: colors.ink },
  countLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
});