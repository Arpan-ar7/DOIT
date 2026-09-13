import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { isUsernameFormatValid, isUsernameTaken } from '../utils/username';
import { useTheme } from '../context/ThemeContext';
import ScreenHeader from '../components/ScreenHeader';
import Avatar from '../components/Avatar';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const { user, updateProfile, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [hostel, setHostel] = useState(user?.hostel ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(user?.photoUri ?? null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const trimmedUsername = username.trim();
  const usernameFormatOk = isUsernameFormatValid(trimmedUsername);
  const usernameTaken = isUsernameTaken(trimmedUsername, user?.username ?? '');

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alert('Permission to access photos is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveError('Name cannot be empty.');
      return;
    }
    if (!usernameFormatOk) {
      setSaveError('Username must be 3–20 alphanumeric characters or underscores.');
      return;
    }
    if (usernameTaken) {
      setSaveError('This username is already taken. Try another.');
      return;
    }
    setSaveError('');
    setSaving(true);
    const result = await updateProfile({
      name: name.trim(),
      username: trimmedUsername,
      hostel: hostel.trim(),
      photoUri,
    });
    setSaving(false);
    if (!result.success) {
      setSaveError(result.error ?? 'Could not save profile.');
      return;
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  }

  async function handleUpdatePassword() {
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        setNewPassword('');
        setTimeout(() => {
          setPasswordSuccess(false);
          setShowPasswordChange(false);
        }, 2000);
      }
    } catch (e: any) {
      setPasswordError(e?.message ?? 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenHeader title="Settings" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textWhite]}>Profile</Text>
          </View>
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <View style={styles.photoRow}>
              <Avatar initials={name ? name[0].toUpperCase() : 'U'} imageUri={photoUri} size={54} />
              <Pressable style={[styles.changePhotoBtn, isDarkMode && styles.changePhotoBtnDark]} onPress={handlePickPhoto}>
                <Ionicons name="camera-outline" size={16} color={isDarkMode ? '#54f0c4' : colors.green} />
                <Text style={[styles.changePhotoText, isDarkMode && styles.changePhotoTextDark]}>Change photo</Text>
              </Pressable>
            </View>

            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Full name</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={isDarkMode ? '#8a9e9f' : colors.muted}
            />

            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Username</Text>
            <View style={[styles.usernameRow, isDarkMode && styles.inputDark]}>
              <Text style={styles.usernamePrefix}>@</Text>
              <TextInput
                style={[styles.usernameInput, isDarkMode && styles.textWhite]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="username"
                placeholderTextColor={isDarkMode ? '#8a9e9f' : colors.muted}
              />
            </View>
            {trimmedUsername.length > 0 && (
              <View style={styles.usernameStatusRow}>
                <Ionicons
                  name={!usernameFormatOk || usernameTaken ? 'close-circle' : 'checkmark-circle'}
                  size={14}
                  color={!usernameFormatOk || usernameTaken ? '#c14b30' : colors.green}
                />
                <Text
                  style={[
                    styles.usernameStatusText,
                    { color: !usernameFormatOk || usernameTaken ? '#c14b30' : colors.green },
                  ]}
                >
                  {!usernameFormatOk
                    ? '3–20 letters, numbers, or _'
                    : usernameTaken
                    ? 'Already taken'
                    : 'Available'}
                </Text>
              </View>
            )}

            <Text style={[styles.label, isDarkMode && styles.labelDark]}>Hostel / Default Room</Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              value={hostel}
              onChangeText={setHostel}
              placeholder="e.g. Block B, Room 304"
              placeholderTextColor={isDarkMode ? '#8a9e9f' : colors.muted}
            />

            {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}
            {saveSuccess && <Text style={styles.successText}>Profile updated.</Text>}

            <Pressable style={styles.btn} onPress={handleSave} disabled={saving}>
              <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save changes'}</Text>
            </Pressable>
          </View>

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textWhite]}>Preferences</Text>
          </View>
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, isDarkMode && styles.textWhite]}>Dark mode</Text>
                <Text style={[styles.switchSub, isDarkMode && styles.textMuted]}>Switch between light and dark theme.</Text>
              </View>
              <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: colors.green }} />
            </View>
            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, isDarkMode && styles.textWhite]}>Push notifications</Text>
                <Text style={[styles.switchSub, isDarkMode && styles.textMuted]}>Get notified when your request is accepted or updated.</Text>
              </View>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: colors.green }} />
            </View>
          </View>

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textWhite]}>Account</Text>
          </View>
          <View style={[styles.card, isDarkMode && styles.cardDark]}>
            <Pressable
              style={styles.menuRow}
              onPress={() => setShowPasswordChange(!showPasswordChange)}
            >
              <Ionicons name="key-outline" size={18} color={isDarkMode ? '#54f0c4' : colors.green} />
              <Text style={[styles.menuLabel, isDarkMode && styles.textWhite]}>Change password</Text>
              <Ionicons name={showPasswordChange ? 'chevron-up' : 'chevron-forward'} size={16} color="#9ba6a0" />
            </Pressable>

            {showPasswordChange && (
              <View style={styles.passwordBox}>
                <Text style={[styles.label, isDarkMode && styles.labelDark]}>New password</Text>
                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Min 6 characters"
                  placeholderTextColor={isDarkMode ? '#8a9e9f' : colors.muted}
                />
                {!!passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                {passwordSuccess && <Text style={styles.successText}>Password updated successfully!</Text>}
                <Pressable
                  style={[styles.btn, { marginTop: 12 }]}
                  onPress={handleUpdatePassword}
                  disabled={passwordSaving}
                >
                  <Text style={styles.btnText}>{passwordSaving ? 'Updating...' : 'Update Password'}</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Pressable style={[styles.logoutBtn, isDarkMode && styles.logoutBtnDark]} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color="#e74c3c" />
            <Text style={[styles.logoutText, isDarkMode && { color: '#e74c3c' }]}>Log out</Text>
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
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  menuLabel: { flex: 1, fontSize: 14, color: colors.ink },
  passwordBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
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

  // Dark mode
  safeDark: { backgroundColor: colors.ink },
  textWhite: { color: '#f8f8f8' },
  textMuted: { color: '#8a9e9f' },
  cardDark: { backgroundColor: '#1a2221', borderColor: '#2d3b38' },
  dividerDark: { backgroundColor: '#2d3b38' },
  changePhotoBtnDark: { backgroundColor: '#1e382b' },
  changePhotoTextDark: { color: '#54f0c4' },
  labelDark: { color: '#aab6b8' },
  inputDark: { backgroundColor: '#121817', borderColor: '#2d3b38', color: '#fff' },
  logoutBtnDark: { backgroundColor: '#2a1a1a', borderColor: '#4a2a2a' },
});