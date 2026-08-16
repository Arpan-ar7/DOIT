import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

type Props = {
  initials: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  imageUri?: string | null;
};

export default function Avatar({
  initials,
  size = 42,
  backgroundColor = '#cde9dc',
  textColor = '#0e5545',
  imageUri,
}: Props) {
  const radius = size * 0.34;

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={{ width: size, height: size, borderRadius: radius }} />;
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: radius, backgroundColor }]}>
      <Text style={[styles.text, { color: textColor, fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '800' },
});