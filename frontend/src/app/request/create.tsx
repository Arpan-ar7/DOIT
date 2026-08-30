import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import { useTheme } from '../../context/ThemeContext';
import { CATEGORY_EMOJIS, RequestCategory, DEFAULT_EXPIRY_HOURS, DEFAULT_DELIVERY_FEE } from '../../constants/mockData';
import ScreenHeader from '../../components/ScreenHeader';

export default function CreateRequestScreen() {
  const router = useRouter();
  const { createRequest } = useRequests();
  const { isDarkMode } = useTheme();

  const [itemName, setItemName] = useState('');
  const [shop, setShop] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [itemBudget, setItemBudget] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(String(DEFAULT_DELIVERY_FEE));
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<RequestCategory>(CATEGORY_EMOJIS[0].category);
  const [expiryHours, setExpiryHours] = useState(DEFAULT_EXPIRY_HOURS);
  const [showFeeHint, setShowFeeHint] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const emoji = CATEGORY_EMOJIS.find((c) => c.category === category)!.emoji;
  const budgetNumber = Number(itemBudget) || 0;
  const feeNumber = Number(deliveryFee) || 0;

  const isValid = itemName.trim().length > 0 && deliveryLocation.trim().length > 0 && budgetNumber > 0;

  async function handlePost() {
    if (!isValid || posting) return;
    setPostError('');
    setPosting(true);
    const result = await createRequest({
      itemName: itemName.trim(),
      shop: shop.trim(),
      emoji,
      category,
      itemBudget: budgetNumber,
      deliveryFee: feeNumber,
      notes: notes.trim(),
      deliveryLocation: deliveryLocation.trim(),
      expiryHours,
    });
    setPosting(false);
    if (!result.success) {
      setPostError(result.error ?? 'Could not post request. Try again.');
      return;
    }
    router.back();
  }

  const inputStyle = [styles.input, isDarkMode && styles.inputDark];
  const labelStyle = [styles.label, isDarkMode && styles.labelDark];

  return (
    <SafeAreaView style={[styles.safe, isDarkMode && styles.safeDark]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScreenHeader title="Create request" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.helper, isDarkMode && styles.helperDark]}>Tell campus mates what you need. Only verified students can see your request.</Text>

          <View style={[styles.formCard, isDarkMode && styles.formCardDark]}>
            <Text style={labelStyle}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORY_EMOJIS.map((c) => (
                <Pressable key={c.category} style={[styles.categoryOption, isDarkMode && styles.categoryOptionDark, category === c.category && styles.categoryOptionActive]} onPress={() => setCategory(c.category)}>
                  <Text style={{ fontSize: 18 }}>{c.emoji}</Text>
                  <Text style={[styles.categoryOptionLabel, isDarkMode && styles.categoryOptionLabelDark, category === c.category && styles.categoryOptionLabelActive]} numberOfLines={1}>{c.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={labelStyle}>What do you need?</Text>
            <TextInput style={inputStyle} placeholder="e.g. Chicken Biryani, Notebook, Paracetamol" placeholderTextColor={colors.muted} value={itemName} onChangeText={setItemName} />

            <Text style={labelStyle}>Shop or place (optional)</Text>
            <TextInput style={inputStyle} placeholder="e.g. Madras Café, Reliance Fresh" placeholderTextColor={colors.muted} value={shop} onChangeText={setShop} />

            <Text style={labelStyle}>Delivery location</Text>
            <TextInput style={inputStyle} placeholder="e.g. Girls Hostel, Main Gate" placeholderTextColor={colors.muted} value={deliveryLocation} onChangeText={setDeliveryLocation} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Approx item budget (₹)</Text>
                <TextInput style={inputStyle} placeholder="e.g. 200" placeholderTextColor={colors.muted} keyboardType="number-pad" value={itemBudget} onChangeText={setItemBudget} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Text style={labelStyle}>Delivery fee (₹)</Text>
                </View>
                <TextInput
                  style={inputStyle}
                  keyboardType="number-pad"
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                  onFocus={() => setShowFeeHint(true)}
                  onBlur={() => setShowFeeHint(false)}
                />
              </View>
            </View>

            {showFeeHint && (
              <View style={[styles.feeHintBox, isDarkMode && styles.feeHintBoxDark]}>
                <Ionicons name="heart" size={14} color={colors.green} />
                <Text style={[styles.feeHintText, isDarkMode && styles.feeHintTextDark]}>Tip: A slightly higher fee helps get your request accepted faster! ✨</Text>
              </View>
            )}

            <Text style={labelStyle}>Notes for your delivery partner (optional)</Text>
            <TextInput style={[inputStyle, styles.textarea]} placeholder="e.g. Extra spicy, Brand: Classmate, Qty: 2" placeholderTextColor={colors.muted} value={notes} onChangeText={setNotes} multiline />
          </View>

          {!!postError && <Text style={styles.errorText}>{postError}</Text>}

          <Text style={[styles.expiryNotice, isDarkMode && styles.expiryNoticeDark]}>
            Note: Unaccepted requests expire automatically after 6 hours.
          </Text>

          <Pressable style={[styles.btn, (!isValid || posting) && styles.btnDisabled]} onPress={handlePost} disabled={!isValid || posting}>
            <Text style={styles.btnText}>{posting ? 'Posting...' : `Post request${budgetNumber ? ` · ₹${budgetNumber} max` : ''}`}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },
  helper: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  formCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 16, marginTop: 18 },
  label: { fontSize: 12, color: '#516164', fontWeight: '700', marginTop: 15, marginBottom: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 4 },
  input: { borderWidth: 1, borderColor: '#e2e7e0', backgroundColor: '#fafbf8', borderRadius: 12, padding: 12, fontSize: 14, color: colors.ink },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 11 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  categoryOption: { flex: 1, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 10, backgroundColor: '#fafbf8', borderWidth: 1, borderColor: '#e2e7e0', alignItems: 'center', gap: 4 },
  categoryOptionActive: { borderColor: colors.green, backgroundColor: colors.mint },
  categoryOptionLabel: { fontSize: 9, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  categoryOptionLabelActive: { color: colors.greenDark },
  feeHintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.mint, padding: 10, borderRadius: 10, marginTop: 8 },
  feeHintText: { flex: 1, fontSize: 11, color: colors.greenDark, lineHeight: 15 },
  expiryChipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  expiryChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: '#fafbf8', borderWidth: 1, borderColor: '#e2e7e0' },
  expiryChipActive: { borderColor: colors.green, backgroundColor: colors.mint },
  expiryChipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  expiryChipTextActive: { color: colors.greenDark },
  expiryBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff8dc', padding: 11, borderRadius: 12, marginTop: 16 },
  expiryTitle: { fontSize: 12, fontWeight: '700', color: '#796224' },
  expirySub: { fontSize: 11, color: '#796224', marginTop: 2 },
  errorText: { color: '#c14b30', fontSize: 12, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  btn: { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  expiryNotice: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 12 },

  // Dark Mode Styles
  safeDark: { backgroundColor: colors.ink },
  helperDark: { color: '#8a9e9f' },
  formCardDark: { backgroundColor: '#1a2221', borderColor: '#2d3b38' },
  labelDark: { color: '#aab6b8' },
  inputDark: { backgroundColor: '#121817', borderColor: '#2d3b38', color: '#fff' },
  categoryOptionDark: { backgroundColor: '#121817', borderColor: '#2d3b38' },
  categoryOptionLabelDark: { color: '#aab6b8' },
  feeHintBoxDark: { backgroundColor: '#1e382b' },
  feeHintTextDark: { color: colors.mint },
  expiryNoticeDark: { color: '#8a9e9f' },
});