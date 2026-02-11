import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Using a default icon set

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: Platform.OS === 'android', // Optional: show header on Android
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'NeatStreet',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'map' : 'map-outline'} size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
