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
import { CATEGORY_EMOJIS, RequestCategory } from '../../constants/mockData';
import ScreenHeader from '../../components/ScreenHeader';

export default function CreateRequestScreen() {
  const router = useRouter();
  const { createRequest } = useRequests();

  const [itemName, setItemName] = useState('');
  const [shop, setShop] = useState('');
  const [itemBudget, setItemBudget] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<RequestCategory>(CATEGORY_EMOJIS[0].category);
  const emoji = CATEGORY_EMOJIS.find((c) => c.category === category)!.emoji;

  const budgetNumber = Number(itemBudget) || 0;
  const feeNumber = Number(deliveryFee) || 0;
  const isValid = itemName.trim().length > 0 && shop.trim().length > 0 && budgetNumber > 0;

  function handlePost() {
    if (!isValid) return;
    createRequest({
      itemName: itemName.trim(),
      shop: shop.trim(),
      emoji,
      category,
      itemBudget: budgetNumber,
      deliveryFee: feeNumber,
      notes: notes.trim(),
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
            <Text style={styles.label}>Category</Text>
            <View style={styles.emojiRow}>
              {CATEGORY_EMOJIS.map((c) => (
                <Pressable
                  key={c.category}
                  style={[styles.emojiOption, category === c.category && styles.emojiOptionActive]}
                  onPress={() => setCategory(c.category)}
                >
                  <Text style={{ fontSize: 20 }}>{c.emoji}</Text>
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

            <Text style={styles.label}>Shop or place</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Madras Café, Reliance Fresh"
              value={shop}
              onChangeText={setShop}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Item budget (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="200"
                  keyboardType="number-pad"
                  value={itemBudget}
                  onChangeText={setItemBudget}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Delivery fee (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="40"
                  keyboardType="number-pad"
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
                />
              </View>
            </View>

            <Text style={styles.label}>Notes for your delivery partner</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="e.g. Extra spicy, Brand: Classmate, Qty: 2, drop near Hostel Gate 3"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.expiryBox}>
              <Ionicons name="time-outline" size={17} color="#796224" />
              <View style={{ flex: 1 }}>
                <Text style={styles.expiryTitle}>Expires in 2 hours</Text>
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
  emojiRow: { flexDirection: 'row', gap: 8 },
  emojiOption: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fafbf8',
    borderWidth: 1,
    borderColor: '#e2e7e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionActive: { borderColor: colors.green, backgroundColor: colors.mint },
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