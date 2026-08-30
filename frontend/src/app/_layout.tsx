import { useEffect, ReactNode } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequestsProvider } from '../context/RequestsContext';
import { CravingsProvider } from '../context/CravingsContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, segments]);

  return <>{children}</>;
}

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RequestsProvider>
            <CravingsProvider>
              <AuthGate>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="request/create" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="request/[id]" />
                  <Stack.Screen name="chat/[id]" />
                  <Stack.Screen name="order/[id]" />
                  <Stack.Screen name="craving/create" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="craving/[id]" />
                  <Stack.Screen name="settings" />
                </Stack>
              </AuthGate>
            </CravingsProvider>
          </RequestsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}