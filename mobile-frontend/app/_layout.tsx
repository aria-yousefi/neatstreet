import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack>
      {/* The main tab navigator is the default screen */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* These screens will be presented modally over the tabs */}
      <Stack.Screen name="camera" options={{ title: 'Take Photo', presentation: 'modal' }} />
      <Stack.Screen name="createReport" options={{ title: 'Create Report', presentation: 'modal' }} />

      {/* This is a standard "push" screen for viewing details */}
      <Stack.Screen name="reportDetail" options={{ title: 'Report Details' }} />
    </Stack>
  );
}
