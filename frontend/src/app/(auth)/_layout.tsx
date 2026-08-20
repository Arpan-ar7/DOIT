import { Stack } from 'expo-router';

// This layout only exists to group Login + Signup as a stack.
// All the auth-gating/redirect logic lives in the ROOT layout
// (src/app/_layout.tsx), not here.
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}