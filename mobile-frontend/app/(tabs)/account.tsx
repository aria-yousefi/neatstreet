import { JSX } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/lib/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function AccountScreen(): JSX.Element {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  username: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
  },
  email: {
    marginTop: 4,
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
    backgroundColor: '#ff444410',
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#cc0000',
    fontWeight: '700',
    fontSize: 16,
  },
});