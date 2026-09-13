import { useEffect, ReactNode } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequestsProvider } from '../context/RequestsContext';
import { CravingsProvider } from '../context/CravingsContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data as { request_id?: string; type?: string } | undefined;
      if (data?.request_id) {
        if (data.type === 'new_message') {
          router.push(`/chat/${data.request_id}`);
        } else if (data.type === 'new_request') {
          router.push(`/request/${data.request_id}`);
        } else {
          router.push(`/order/${data.request_id}`);
        }
      }
    });

    return () => sub.remove();
  }, [router]);

  // Deep link handler: when user taps the password-reset link from email,
  // Supabase fires PASSWORD_RECOVERY. Navigate to the reset screen.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password' as any);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#121212' : '#ffffff' }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingInner}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: isDarkMode ? '#f8f8f8' : '#172226' }]}>UniCart</Text>
          <Text style={[styles.tagline, { color: isDarkMode ? '#a0b0b4' : '#708084' }]}>
            Campus Deliveries, Simplified
          </Text>
          <ActivityIndicator size="large" color="#166b57" style={styles.spinner} />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  spinner: {
    marginTop: 16,
  },
});

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