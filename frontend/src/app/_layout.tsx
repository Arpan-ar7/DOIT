import { Stack } from 'expo-router';
import { RequestsProvider } from '../context/RequestsContext';

export default function RootLayout() {
  return (
    <RequestsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="request/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="request/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="order/[id]" />
      </Stack>
    </RequestsProvider>
  );
}