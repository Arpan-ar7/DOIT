import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleUpdatePassword() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle-outline" size={36} color="#fff" />
          </View>
          <Text style={styles.title}>Password updated!</Text>
          <Text style={styles.successBody}>
            Your password has been changed successfully. You're all set.
          </Text>

          <Pressable style={styles.btn} onPress={() => router.replace('/')}>
            <Text style={styles.btnText}>Continue to App</Text>
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
          <View style={styles.logoBox}>
            <Ionicons name="key-outline" size={28} color="#fff" />
          </View>
          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>
            Choose a strong password that you haven't used before.
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>New password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable style={styles.btn} onPress={handleUpdatePassword} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Updating...' : 'Update Password'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: 60 },
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
  label: { fontSize: 12, color: '#516164', fontWeight: '700', marginTop: 15, marginBottom: 7 },
  input: {
    borderWidth: 1, borderColor: '#e2e7e0', backgroundColor: '#fafbf8',
    borderRadius: 12, padding: 12, fontSize: 14, color: colors.ink,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e7e0', backgroundColor: '#fafbf8', borderRadius: 12,
  },
  passwordInput: { flex: 1, padding: 12, fontSize: 14, color: colors.ink },
  eyeBtn: { paddingHorizontal: 12 },
  errorText: { color: '#c14b30', fontSize: 12, fontWeight: '600', marginTop: 12 },
  btn: {
    backgroundColor: colors.green, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Success state styles
  successIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successBody: {
    fontSize: 14, color: colors.muted, lineHeight: 21, marginBottom: 24,
  },
});
