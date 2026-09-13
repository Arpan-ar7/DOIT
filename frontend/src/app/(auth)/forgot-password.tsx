import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleReset() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'unicart://reset-password',
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-outline" size={34} color="#fff" />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.successBody}>
            We've sent a password reset link to{'\n'}
            <Text style={{ fontWeight: '700', color: colors.ink }}>{email.trim().toLowerCase()}</Text>
          </Text>
          <Text style={styles.successHint}>
            Open the link in the email to set a new password. If you don't see it, check your spam folder.
          </Text>

          <Pressable style={styles.btn} onPress={() => router.replace('/login')}>
            <Text style={styles.btnText}>Back to Login</Text>
          </Pressable>

          <Pressable style={styles.resendBtn} onPress={() => { setSent(false); setError(''); }}>
            <Text style={styles.resendText}>Didn't receive it? Try again</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>

          <View style={styles.logoBox}>
            <Ionicons name="lock-closed-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter the email you used to sign up and we'll send you a link to reset your password.
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable style={styles.btn} onPress={handleReset} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Remember your password? </Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={styles.switchLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: 20 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  logoBox: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.muted, marginBottom: 26, lineHeight: 19 },
  formCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.lg, padding: 18,
  },
  label: { fontSize: 12, color: '#516164', fontWeight: '700', marginTop: 2, marginBottom: 7 },
  input: {
    borderWidth: 1, borderColor: '#e2e7e0', backgroundColor: '#fafbf8',
    borderRadius: 12, padding: 12, fontSize: 14, color: colors.ink,
  },
  errorText: { color: '#c14b30', fontSize: 12, fontWeight: '600', marginTop: 12 },
  btn: {
    backgroundColor: colors.green, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22, marginBottom: 20 },
  switchText: { color: colors.muted, fontSize: 13 },
  switchLink: { color: colors.green, fontSize: 13, fontWeight: '700' },

  // Success state styles
  successIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 60,
  },
  successBody: {
    fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 10,
  },
  successHint: {
    fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 30,
  },
  resendBtn: { alignItems: 'center', marginTop: 14 },
  resendText: { color: colors.green, fontSize: 13, fontWeight: '600' },
});
