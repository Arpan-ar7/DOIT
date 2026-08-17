import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import {
  CATEGORY_EMOJIS,
  RequestCategory,
  EXPIRY_OPTIONS,
  DEFAULT_EXPIRY_HOURS,
  DEFAULT_DELIVERY_FEE,
} from '../../constants/mockData';
import ScreenHeader from '../../components/ScreenHeader';

export default function CreateRequestScreen() {
  const router = useRouter();
  const { createRequest } = useRequests();

  const [itemName, setItemName] = useState('');
  const [shop, setShop] = useState(''); // now OPTIONAL — no longer required to submit
  const [deliveryLocation, setDeliveryLocation] = useState(''); // NEW — mandatory
  const [itemBudget, setItemBudget] = useState('');
  // Delivery fee now starts PRE-FILLED at the default (₹10), not blank —
  // the person only needs to touch it if they want to change it.
  const [deliveryFee, setDeliveryFee] = useState(String(DEFAULT_DELIVERY_FEE));
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<RequestCategory>(CATEGORY_EMOJIS[0].category);
  const [expiryHours, setExpiryHours] = useState(DEFAULT_EXPIRY_HOURS); // defaults to 4h
  const [showFeeHint, setShowFeeHint] = useState(false); // toggles the "why raise the fee" tip

  const emoji = CATEGORY_EMOJIS.find((c) => c.category === category)!.emoji;
  const budgetNumber = Number(itemBudget) || 0;
  const feeNumber = Number(deliveryFee) || 0;
  const selectedExpiryLabel = EXPIRY_OPTIONS.find((o) => o.hours === expiryHours)?.label ?? `${expiryHours}h`;

  // Shop is NOT part of this check anymore — only these four things are
  // actually required to post a request.
  const isValid =
    itemName.trim().length > 0 &&
    deliveryLocation.trim().length > 0 &&
    budgetNumber > 0;

  function handlePost() {
    if (!isValid) return;
    createRequest({
      itemName: itemName.trim(),
      shop: shop.trim(), // may be an empty string — that's fine, it's optional
      emoji,
      category,
      itemBudget: budgetNumber,
      deliveryFee: feeNumber,
      notes: notes.trim(),
      deliveryLocation: deliveryLocation.trim(),
      expiryHours,
    });
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScreenHeader title="Create request" />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.helper}>
            Tell campus mates what you need. Only verified students can see your request.
          </Text>

          <View style={styles.formCard}>
            {/* CATEGORY — now 6 options, mandatory (always has a selection). */}
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORY_EMOJIS.map((c) => (
                <Pressable
                  key={c.category}
                  style={[styles.categoryOption, category === c.category && styles.categoryOptionActive]}
                  onPress={() => setCategory(c.category)}
                >
                  <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryOptionLabel,
                      category === c.category && styles.categoryOptionLabelActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>What do you need?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chicken Biryani, Notebook, Paracetamol"
              value={itemName}
              onChangeText={setItemName}
            />

            {/* SHOP — now optional. Label says so explicitly. */}
            <Text style={styles.label}>Shop or place (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Madras Café, Reliance Fresh"
              value={shop}
              onChangeText={setShop}
            />

            {/* DELIVERY LOCATION — brand new field, mandatory. */}
            <Text style={styles.label}>Delivery location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Girls Hostel, Main Gate"
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Approx item budget (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 200"
                  keyboardType="number-pad"
                  value={itemBudget}
                  onChangeText={setItemBudget}
                />
              </View>
              <View style={{ flex: 1 }}>
                {/* Label + info icon on the same row, so the hint sits right
                    next to the thing it's explaining. */}
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Delivery fee (₹)</Text>
                  <Pressable onPress={() => setShowFeeHint((v) => !v)} hitSlop={8}>
                    <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                />
              </View>
            </View>

            {/* Fee hint — toggled by tapping the ⓘ icon above. */}
            {showFeeHint && (
              <View style={styles.feeHintBox}>
                <Ionicons name="trending-up" size={14} color={colors.green} />
                <Text style={styles.feeHintText}>
                  A higher delivery fee usually gets your request accepted faster.
                </Text>
              </View>
            )}

            <Text style={styles.label}>Notes for your delivery partner (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="e.g. Extra spicy, Brand: Classmate, Qty: 2"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* EXPIRY — selectable chips instead of a fixed "2 hours" label. */}
            <Text style={styles.label}>Expires in</Text>
            <View style={styles.expiryChipRow}>
              {EXPIRY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.hours}
                  style={[styles.expiryChip, expiryHours === opt.hours && styles.expiryChipActive]}
                  onPress={() => setExpiryHours(opt.hours)}
                >
                  <Text
                    style={[
                      styles.expiryChipText,
                      expiryHours === opt.hours && styles.expiryChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.expiryBox}>
              <Ionicons name="time-outline" size={17} color="#796224" />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiryTitle}>Expires in {selectedExpiryLabel}</Text>
                <Text style={styles.expirySub}>
                  Your request will automatically close after that.
                </Text>
              </View>
            </View>
          </View>

          <Pressable style={[styles.btn, !isValid && styles.btnDisabled]} onPress={handlePost} disabled={!isValid}>
            <Text style={styles.btnText}>
              Post request{budgetNumber ? ` · ₹${budgetNumber} max` : ''}
            </Text>
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
  formCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 18,
  },
  label: { fontSize: 12, color: '#516164', fontWeight: '700', marginTop: 15, marginBottom: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e7e0',
    backgroundColor: '#fafbf8',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
  },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 11 },
  // Category row now wraps onto a second line since there are 6 options
  // instead of 4 — flexWrap keeps it from overflowing off-screen.
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: {
    width: 66,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fafbf8',
    borderWidth: 1,
    borderColor: '#e2e7e0',
    alignItems: 'center',
    gap: 4,
  },
  categoryOptionActive: { borderColor: colors.green, backgroundColor: colors.mint },
  categoryOptionLabel: { fontSize: 10, color: colors.muted, fontWeight: '600' },
  categoryOptionLabelActive: { color: colors.greenDark },
  feeHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.mint,
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  feeHintText: { flex: 1, fontSize: 11, color: colors.greenDark, lineHeight: 15 },
  expiryChipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  expiryChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#fafbf8',
    borderWidth: 1,
    borderColor: '#e2e7e0',
  },
  expiryChipActive: { borderColor: colors.green, backgroundColor: colors.mint },
  expiryChipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  expiryChipTextActive: { color: colors.greenDark },
  expiryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff8dc',
    padding: 11,
    borderRadius: 12,
    marginTop: 16,
  },
  expiryTitle: { fontSize: 12, fontWeight: '700', color: '#796224' },
  expirySub: { fontSize: 11, color: '#796224', marginTop: 2 },
  btn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});