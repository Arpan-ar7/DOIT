import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

type Props = {
  title: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
};

export default function ScreenHeader({ title, rightIcon, onRightPress }: Props) {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  return (
    <View style={styles.top}>
      <Pressable style={[styles.iconBtn, isDarkMode && styles.iconBtnDark]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={isDarkMode ? '#f8f8f8' : colors.ink} />
      </Pressable>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>{title}</Text>
      {rightIcon ? (
        <Pressable style={[styles.iconBtn, isDarkMode && styles.iconBtnDark]} onPress={onRightPress}>
          <Ionicons name={rightIcon} size={19} color={isDarkMode ? '#f8f8f8' : colors.ink} />
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDark: {
    backgroundColor: '#1a2221',
  },
  placeholder: { width: 39, height: 39 },
  title: { fontSize: 20, fontWeight: '700', color: colors.ink },
  titleDark: { color: '#f8f8f8' },
});