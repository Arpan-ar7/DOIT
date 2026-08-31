import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as lightColors, darkThemeColors, radius, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import { submitReportApi, ReportType } from '../lib/reportsApi';
import { useRouter } from 'expo-router';

type Category = { key: ReportType; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string };

const CATEGORIES: Category[] = [
  { key: 'bug',           label: 'Bug / App issue',    icon: 'bug-outline',          desc: 'Something is broken or not working' },
  { key: 'complaint',     label: 'Complaint',           icon: 'warning-outline',      desc: 'Bad experience with a delivery' },
  { key: 'payment_issue', label: 'Payment issue',       icon: 'card-outline',         desc: 'Wrong fee, missing payment, etc.' },
  { key: 'user_report',   label: 'Report a user',       icon: 'person-remove-outline', desc: 'Inappropriate behaviour by another user' },
  { key: 'query',         label: 'Question / Query',    icon: 'help-circle-outline',  desc: 'General question or feedback' },
  { key: 'other',         label: 'Other',               icon: 'ellipsis-horizontal-outline', desc: 'Anything else' },
];

export default function ReportScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? darkThemeColors : lightColors;
  const styles = React.useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);

  const [selected, setSelected] = useState<ReportType | null>(null);
  const [subject, setSubject]   = useState('');
  const [desc, setDesc]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = selected && subject.trim().length > 2 && desc.trim().length > 5 && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !selected) return;
    setSubmitting(true);
    setError('');
    try {
      await submitReportApi({ type: selected, subject: subject.trim(), description: desc.trim() });
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Report a problem" />
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={colors.green} />
          </View>
          <Text style={styles.successTitle}>Report submitted</Text>
          <Text style={styles.successSub}>
            We've received your report and will look into it shortly. Thank you for helping make the app better!
          </Text>
          <Pressable style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Settings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Report a problem" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Category picker */}
          <Text style={styles.sectionLabel}>What's the issue?</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const active = selected === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[styles.catCard, active && styles.catCardActive]}
                  onPress={() => setSelected(cat.key)}
                >
                  <Ionicons
                    name={cat.icon}
                    size={22}
                    color={active ? colors.green : (isDarkMode ? '#8a9e9f' : '#7a9080')}
                  />
                  <Text style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</Text>
                  <Text style={styles.catDesc} numberOfLines={2}>{cat.desc}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Subject */}
          <Text style={styles.sectionLabel}>Subject</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief one-line summary…"
            placeholderTextColor={isDarkMode ? '#556060' : '#aab8b0'}
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
          />

          {/* Description */}
          <Text style={styles.sectionLabel}>Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the problem in detail. The more you tell us, the faster we can help."
            placeholderTextColor={isDarkMode ? '#556060' : '#aab8b0'}
            value={desc}
            onChangeText={setDesc}
            multiline
            maxLength={2000}
          />
          <Text style={styles.charCount}>{desc.length}/2000</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#c14b30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Submit report</Text>}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 48, paddingTop: 12 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, marginBottom: 10, marginTop: 20 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 13,
    gap: 6,
  },
  catCardActive: { borderColor: colors.green, backgroundColor: isDark ? '#0e2e22' : '#ecfaf3' },
  catLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  catLabelActive: { color: colors.green },
  catDesc: { fontSize: 10, color: colors.muted, lineHeight: 14 },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  textArea: { height: 120, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: colors.muted, textAlign: 'right', marginTop: 4 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: isDark ? '#3d1a1a' : '#fdf0ee',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: { fontSize: 12, color: '#c14b30', flex: 1 },

  submitBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Success state
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 14 },
  successIcon: { marginBottom: 6 },
  successTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  successSub: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  doneBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.lg,
    paddingHorizontal: 32,
    paddingVertical: 13,
    marginTop: 12,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
