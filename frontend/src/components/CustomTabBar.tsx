import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ICON_MAP: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  orders: { active: 'receipt', inactive: 'receipt-outline' },
  messages: { active: 'chatbubble', inactive: 'chatbubble-outline' },
};

const ACTIVE_BUBBLE = 52;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => ICON_MAP[r.name]);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>  
      <View style={styles.bar}>
        {visibleRoutes.map((route) => {
          const realIndex = state.routes.indexOf(route);
          const focused = state.index === realIndex;
          const icons = ICON_MAP[route.name];
          const options = descriptors[route.key].options;
          const label = (options.title ?? route.name) as string;
          const badge = options.tabBarBadge;

          return (
            <TabItem
              key={route.key}
              focused={focused}
              iconName={focused ? icons.active : icons.inactive}
              label={label}
              badge={badge as number | undefined}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({
  focused,
  iconName,
  label,
  badge,
  onPress,
  onLongPress,
}: {
  focused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  }, [focused]);

  const bubbleScale = scale.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const bubbleTranslate = scale.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });

  return (
    <Pressable style={styles.tab} onPress={onPress} onLongPress={onLongPress} accessibilityRole="button">
      <Animated.View
        style={[
          styles.bubble,
          focused && styles.bubbleActive,
          {
            transform: [{ scale: bubbleScale }, { translateY: bubbleTranslate }],
          },
        ]}
      >
        <Ionicons name={iconName} size={focused ? 24 : 22} color={focused ? '#fff' : '#8a9898'} />
        {!!badge && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </Animated.View>
      <Text
        style={[
          styles.label,
          focused && styles.labelActive,
          { transform: [{ translateY: focused ? -12 : 0 }] },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px -2px 20px rgba(0,0,0,0.08)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -2 },
        elevation: 12,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  bubble: {
    width: ACTIVE_BUBBLE,
    height: ACTIVE_BUBBLE,
    borderRadius: ACTIVE_BUBBLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleActive: {
    backgroundColor: colors.green,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(30,120,80,0.35)' },
      default: {
        shadowColor: colors.green,
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
      },
    }),
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8a9898',
    marginTop: 2,
  },
  labelActive: {
    color: colors.green,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
});
