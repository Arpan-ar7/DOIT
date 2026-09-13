import React, { useRef, useEffect } from 'react';
import { Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  
  const anim = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isDarkMode ? 1 : 0,
      useNativeDriver: false,
      friction: 5.5,
      tension: 90,
    }).start();
  }, [isDarkMode, anim]);

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e0ebd5', '#1b2d42'] // adapts nicely between light (mint-ish) and dark modes
  });

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 27]
  });

  const iconRotation = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const sunOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0]
  });

  const moonOpacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1]
  });

  return (
    <Pressable onPress={toggleDarkMode}>
      <Animated.View style={[styles.track, { backgroundColor: bgColor }]}>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }, { rotate: iconRotation }] }]}>
          <Animated.View style={[styles.iconWrapper, { opacity: sunOpacity }]}>
            <Ionicons name="sunny" size={15} color="#e67e22" />
          </Animated.View>
          <Animated.View style={[styles.iconWrapper, { opacity: moonOpacity }]}>
            <Ionicons name="moon" size={14} color="#8b5cf6" />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 60,
    height: 32,
    borderRadius: 18,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(150,160,160,0.1)',
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    ...Platform.select({
      web: { boxShadow: '0px 2px 7px rgba(0,0,0,0.15)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
      },
    }),
  },
  iconWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
