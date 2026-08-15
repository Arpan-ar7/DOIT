import React, { useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../constants/theme';
import { useRequests } from '../../context/RequestsContext';
import Avatar from '../../components/Avatar';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getRequestById, messagesByRequest, sendMessage, seedConversation, markRead } = useRequests();
  const request = getRequestById(id);
  const messages = messagesByRequest[id] ?? [];
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (request) {
      seedConversation(request.id, request.requester.name.split(' ')[0]);
      markRead(request.id);
    }
  }, [request?.id]);

  function handleSend() {
    if (!text.trim() || !request) return;
    sendMessage(request.id, text.trim(), true);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>This conversation no longer exists.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.top}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <View style={styles.person}>
            <Avatar initials={request.requester.initials} backgroundColor="#d4e8f8" textColor="#236b95" />
            <View>
              <Text style={styles.personName}>{request.requester.name}</Text>
              <Text style={styles.online}>● Online</Text>
            </View>
          </View>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="call-outline" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.chatArea}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <Text style={styles.date}>Today</Text>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubble, m.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={m.fromMe ? styles.bubbleTextMe : styles.bubbleTextThem}>{m.text}</Text>
              <Text style={styles.bubbleTime}>{m.time}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${request.requester.name.split(' ')[0]}...`}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.cream,
  },
  iconBtn: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  personName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  online: { fontSize: 11, color: colors.green, marginTop: 2 },
  chatArea: { padding: spacing.xl, gap: 10, flexGrow: 1 },
  date: { textAlign: 'center', color: colors.muted, fontSize: 11, marginBottom: 8 },
  bubble: { maxWidth: '78%', paddingVertical: 11, paddingHorizontal: 13, borderRadius: 15 },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 5,
  },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.mint, borderBottomRightRadius: 5 },
  bubbleTextThem: { fontSize: 13, lineHeight: 18, color: colors.ink },
  bubbleTextMe: { fontSize: 13, lineHeight: 18, color: '#174e3e' },
  bubbleTime: { fontSize: 9, opacity: 0.58, textAlign: 'right', marginTop: 4, color: colors.ink },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e7e0',
    backgroundColor: '#fafbf8',
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 13,
    fontSize: 14,
  },
  sendBtn: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});