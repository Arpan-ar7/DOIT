import { Platform } from 'react-native';

export const colors = {
  ink: '#172226',
  muted: '#708084',
  cream: '#f8f8f3',
  surface: '#ffffff',
  line: '#e6eae3',
  green: '#166b57',
  greenDark: '#0e5545',
  mint: '#dcf2e8',
  orange: '#f47b44',
  yellow: '#ffe59a',
  blue: '#e8f3ff',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 19,
  xl: 22,
};

export const shadow = Platform.select({
  web: {
    boxShadow: '0px 10px 14px rgba(24, 44, 37, 0.08)',
  },
  default: {
    shadowColor: '#182c25',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
};

export const Colors = {
  light: {
    text: colors.ink,
    background: colors.cream,
    tint: colors.green,
    icon: colors.muted,
    tabIconDefault: colors.muted,
    tabIconSelected: colors.green,
  },
  dark: {
    text: colors.ink,
    background: colors.cream,
    tint: colors.green,
    icon: colors.muted,
    tabIconDefault: colors.muted,
    tabIconSelected: colors.green,
  },
};

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
export const Spacing = {
  zero: 0,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 28,
  eight: 32,
};