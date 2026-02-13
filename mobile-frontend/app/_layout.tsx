import { Stack, useRouter, usePathname } from 'expo-router';
import React from 'react';
import { AuthProvider, useAuth } from '../src/lib/AuthContext';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

const AppLayout = () => {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // To check if the user is in the authentication flow, we can check the pathname.
    // This is simpler and more type-safe than inspecting URL segments.
    const inAuthGroup = pathname === '/login' || pathname === '/register';

    if (!user && !inAuthGroup) {
      // Use an absolute path for redirection from the root layout.
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, isLoading, pathname, router]);

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ title: 'Map', headerShown: false }} />
      <Stack.Screen name="camera" options={{ title: 'Take Photo' }} />
      <Stack.Screen name="selectLocation" options={{ title: 'Select Location' }} />
      <Stack.Screen name="createReport" options={{ title: 'Create Report' }} />
      <Stack.Screen name="reportDetail" options={{ title: 'Report Details' }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
