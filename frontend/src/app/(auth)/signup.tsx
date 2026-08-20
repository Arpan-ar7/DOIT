import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { isGrNoFormatValid } from '../../utils/validation';

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [grNo, setGrNo] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const trimmedGrNo = grNo.trim();
  const grNoFormatOk = trimmedGrNo.length === 0 || isGrNoFormatValid(trimmedGrNo);

  async function handleSignup() {
    setError('');
    if (!grNoFormatOk) {
      setError('GR No must be exactly 6 digits.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await signup(name, email, grNo, phone, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Something went wrong. Try again.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* CHANGED — same fix as login.tsx: 'height' on Android instead of undefined. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBox}>
            <Ionicons name="bicycle" size={30} color="#fff" />
          </View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join CampusCarry to start requesting or delivering.</Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>Full name</Text>
            <TextInput style={styles.input} placeholder="e.g. Aarav Sharma" value={name} onChangeText={setName} />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>GR No</Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit registration number"
              keyboardType="number-pad"
              maxLength={6}
              value={grNo}
              onChangeText={setGrNo}
            />
            {trimmedGrNo.length > 0 && !grNoFormatOk && (
              <Text style={styles.hintTextError}>Must be exactly 6 digits.</Text>
            )}

            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 6 characters"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable style={styles.btn} onPress={handleSignup} disabled={loading}>
              <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
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
  // CHANGED — same reasoning as login.tsx: top-anchored + scrollable, no
  // vertical centering fighting with the keyboard.
  content: { flexGrow: 1, padding: spacing.xl, paddingTop: 60 },
  logoBox: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.muted, marginBottom: 26 },
  formCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 18 },
  label: { fontSize: 12, color: '#516164', fontWeight: '700', marginTop: 15, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: '#e2e7e0', backgroundColor: '#fafbf8', borderRadius: 12, padding: 12, fontSize: 14, color: colors.ink },
  hintTextError: { color: '#c14b30', fontSize: 11, marginTop: 5, fontWeight: '600' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e7e0', backgroundColor: '#fafbf8', borderRadius: 12 },
  passwordInput: { flex: 1, padding: 12, fontSize: 14, color: colors.ink },
  eyeBtn: { paddingHorizontal: 12 },
  errorText: { color: '#c14b30', fontSize: 12, fontWeight: '600', marginTop: 12 },
  btn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22, marginBottom: 20 },
  switchText: { color: colors.muted, fontSize: 13 },
  switchLink: { color: colors.green, fontSize: 13, fontWeight: '700' },
});