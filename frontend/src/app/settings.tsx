import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { isUsernameFormatValid, isUsernameTaken } from '../utils/username';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';

export default function SettingsScreen() {
  const { user, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photoUri ?? null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmedUsername = username.trim().toLowerCase();
  const usernameFormatOk = trimmedUsername.length === 0 || isUsernameFormatValid(trimmedUsername);
  const usernameTaken =
    trimmedUsername.length > 0 &&
    isUsernameFormatValid(trimmedUsername) &&
    isUsernameTaken(trimmedUsername, user?.username);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSaveError('Allow photo access in your device settings to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    setSaveError('');
    setSaveSuccess(false);

    if (!name.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }
    if (!usernameFormatOk) {
      setSaveError('Username must be 3–20 characters: letters, numbers, and underscores only.');
      return;
    }
    if (usernameTaken) {
      setSaveError('That username is already taken — try another.');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      name: name.trim(),
      username: trimmedUsername || user?.username,
      photoUri,
    });
    setSaving(false);

    if (!result.success) {
      setSaveError(result.error ?? 'Could not save changes.');
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenHeader title="Settings" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Profile</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.photoRow}>
              <Avatar initials={(user?.username ?? 'S').slice(0, 2).toUpperCase()} imageUri={photoUri} size={64} />
              <Pressable style={styles.changePhotoBtn} onPress={handlePickPhoto}>
                <Ionicons name="camera-outline" size={15} color={colors.green} />
                <Text style={styles.changePhotoText}>Change photo</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Full name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />

            <Text style={styles.label}>Username</Text>
            <View style={styles.usernameRow}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={styles.usernameInput}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="username"
              />
            </View>
            {trimmedUsername.length > 0 && (
              <View style={styles.usernameStatusRow}>
                <Ionicons
                  name={usernameFormatOk && !usernameTaken ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={usernameFormatOk && !usernameTaken ? colors.green : '#c14b30'}
                />
                <Text
                  style={[
                    styles.usernameStatusText,
                    { color: usernameFormatOk && !usernameTaken ? colors.green : '#c14b30' },
                  ]}
                >
                  {!usernameFormatOk
                    ? '3–20 characters: letters, numbers, underscores only'
                    : usernameTaken
                    ? 'Already taken'
                    : 'Available'}
                </Text>
              </View>
            )}


            {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}
            {saveSuccess && <Text style={styles.successText}>Profile updated.</Text>}

            <Pressable style={styles.btn} onPress={handleSave} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save changes'}</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Push notifications</Text>
                <Text style={styles.switchSub}>Get notified when your request is accepted or updated.</Text>
              </View>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: colors.green }} />
            </View>
            {/* "Share phone number" removed — will come back later, per request. */}
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>
          <View style={styles.card}>
            <Pressable style={styles.menuRow} onPress={() => setPasswordNotice(true)}>
              <Ionicons name="key-outline" size={18} color={colors.green} />
              <Text style={styles.menuLabel}>Change password</Text>
              <Ionicons name="chevron-forward" size={16} color="#9ba6a0" />
            </Pressable>
            {passwordNotice && (
              <Text style={styles.noticeText}>Password changes will be available soon.</Text>
            )}
          </View>

          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#c14b30" />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  sectionHead: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  changePhotoText: { color: colors.green, fontSize: 12, fontWeight: '700' },
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
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e7e0',
    backgroundColor: '#fafbf8',
    borderRadius: 12,
    paddingLeft: 12,
  },
  usernamePrefix: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  usernameInput: { flex: 1, padding: 12, fontSize: 14, color: colors.ink },
  usernameStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  usernameStatusText: { fontSize: 11, fontWeight: '600' },
  errorText: { color: '#c14b30', fontSize: 12, fontWeight: '600', marginTop: 14 },
  successText: { color: colors.green, fontSize: 12, fontWeight: '600', marginTop: 14 },
  btn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  switchLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  switchSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  menuLabel: { flex: 1, fontSize: 14, color: colors.ink },
  noticeText: { fontSize: 11, color: colors.muted, marginTop: 10, lineHeight: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#fdf0ee',
    borderWidth: 1,
    borderColor: '#f3c9c0',
  },
  logoutText: { color: '#c14b30', fontSize: 14, fontWeight: '800' },
});