import { Stack, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { AuthProvider, useAuth } from '../src/lib/AuthContext';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

const AppLayout = () => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Check if the user is currently on the login screen.
    const inAuthRoute = segments[0] === 'login';

    if (!user && !inAuthRoute) {
      router.replace('/login');
    } else if (user && inAuthRoute) {
      router.replace('/');
    }
  }, [user, isLoading, segments, router]);

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ title: 'Take Photo', presentation: 'modal' }} />
      <Stack.Screen name="selectLocation" options={{ title: 'Select Location', presentation: 'modal' }} />
      <Stack.Screen name="createReport" options={{ title: 'Create Report', presentation: 'modal' }} />
      <Stack.Screen name="reportDetail" options={{ title: 'Report Details' }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}
