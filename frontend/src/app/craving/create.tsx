import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Modal, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { horror, radius, spacing } from '../../constants/theme';
import { HOSTEL_OPTIONS, CRAVING_LABELS } from '../../constants/mockData';
import { useCravings } from '../../context/CravingsContext';
import { useAuth } from '../../context/AuthContext';

// @ts-ignore
import batImg from '../../assets/horror/bat.jpg';

export default function CreateCravingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { postCraving } = useCravings();

  const defaultHostelOption = user?.hostel && (HOSTEL_OPTIONS as readonly string[]).includes(user.hostel)
    ? user.hostel
    : (user?.hostel ? 'Other' : HOSTEL_OPTIONS[0]);

  const [what, setWhat] = useState('');
  const [hostel, setHostel] = useState<string>(defaultHostelOption);
  const [otherHostel, setOtherHostel] = useState(defaultHostelOption === 'Other' ? (user?.hostel ?? '') : '');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [showHostelPicker, setShowHostelPicker] = useState(false);

  const priceNum = Number(price) || 0;
  const isValid = what.trim().length > 0 && priceNum > 0;

  async function handlePost() {
    if (!isValid || posting) return;
    setPostError('');
    setPosting(true);
    const result = await postCraving({
      what: what.trim(),
      hostel: hostel === 'Other' ? (otherHostel.trim() || 'Other') : hostel,
      price: priceNum,
      note: note.trim(),
    });
    setPosting(false);
    if (!result.success) {
      setPostError(result.error ?? 'Something went wrong. Try again.');
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color={horror.white} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>🆘 Send Out an SOS</Text>
          </View>
          <Image source={batImg} style={styles.headerBat} resizeMode="contain" />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.helper}>
            Late night hunger pangs? Drop your craving and let a fellow night owl rescue you 🦉
          </Text>

          <View style={styles.formCard}>
            {/* Top red accent bar */}
            <View style={styles.cardAccent} />

            {/* What's the craving */}
            <Text style={styles.label}>🍜 What's the craving?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maggi packet, Cold coffee, Chips..."
              placeholderTextColor={horror.muted}
              value={what}
              onChangeText={setWhat}
            />

            {/* Hostel picker */}
            <Text style={styles.label}>🏚️ Your Bunker</Text>
            <Pressable style={styles.pickerBtn} onPress={() => setShowHostelPicker(true)}>
              <Text style={styles.pickerText}>{hostel}</Text>
              <Ionicons name="chevron-down" size={18} color={horror.redGlow} />
            </Pressable>

            {hostel === 'Other' && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Type your location..."
                placeholderTextColor={horror.muted}
                value={otherHostel}
                onChangeText={setOtherHostel}
              />
            )}

            {/* Price */}
            <Text style={styles.label}>💰 Bribe Money (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50"
              placeholderTextColor={horror.muted}
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
            />

            {/* Note */}
            <Text style={styles.label}>📝 Ransom Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="e.g. Extra spicy, need 2 packets, bring ketchup..."
              placeholderTextColor={horror.muted}
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>

          {!!postError && <Text style={styles.errorText}>{postError}</Text>}

          <Pressable
            style={[styles.postBtn, (!isValid || posting) && styles.postBtnDisabled]}
            onPress={handlePost}
            disabled={!isValid || posting}
          >
            <Text style={styles.postBtnText}>
              {posting ? '⏳ Summoning...' : CRAVING_LABELS.post}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Hostel Picker Modal */}
        <Modal visible={showHostelPicker} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowHostelPicker(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🏚️ Pick Your Bunker</Text>
              {HOSTEL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.modalOption, hostel === opt && styles.modalOptionActive]}
                  onPress={() => {
                    setHostel(opt);
                    setShowHostelPicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, hostel === opt && styles.modalOptionTextActive]}>
                    {opt}
                  </Text>
                  {hostel === opt && <Ionicons name="checkmark" size={18} color={horror.redBright} />}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: horror.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: horror.border,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: horror.redBright,
    textShadowColor: horror.red,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  headerBat: { width: 28, height: 28, opacity: 0.7 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  helper: {
    fontSize: 13,
    color: horror.textSecondary,
    lineHeight: 19,
    marginTop: 12,
  },
  formCard: {
    backgroundColor: horror.cardBg,
    borderWidth: 1,
    borderColor: horror.border,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 18,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: horror.redBright,
  },
  label: {
    fontSize: 13,
    color: horror.redGlow,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: horror.border,
    backgroundColor: horror.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: horror.textPrimary,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: horror.border,
    backgroundColor: horror.surface,
    borderRadius: 12,
    padding: 12,
  },
  pickerText: { color: horror.textPrimary, fontSize: 14, fontWeight: '600' },
  errorText: { color: horror.redGlow, fontSize: 12, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  postBtn: {
    backgroundColor: horror.red,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 22,
    ...Platform.select({
      web: { boxShadow: `0px 0px 24px ${horror.redGlow}40` },
      default: {
        shadowColor: horror.redGlow,
        shadowOpacity: 0.4,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      },
    }),
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: horror.cardBg,
    borderRadius: radius.lg,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: horror.red,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: horror.redBright,
    marginBottom: 14,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: horror.surfaceLight },
  modalOptionText: { color: horror.textPrimary, fontSize: 15, fontWeight: '600' },
  modalOptionTextActive: { color: horror.redBright, fontWeight: '800' },
});
