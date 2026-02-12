import { JSX, useState, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../src/lib/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { getMyReports, deleteReport, Report } from '../../src/lib/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'react-native';


export default function AccountScreen(): JSX.Element {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(() => {
    if (!user) return;
    setLoading(true);
    getMyReports(user.id)
      .then(setReports)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [user]);

  useFocusEffect(loadReports);

  const handleDelete = async (reportId: string) => {
    if (!user) return;
    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteReport(parseInt(reportId), user.id).then(loadReports) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={80} color="#ccc" />
        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.reportsSection}>
        <Text style={styles.sectionTitle}>My Reports</Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.reportItem}
                onPress={() =>
                  router.push({
                    // Navigate to the detail screen from the (tabs) group
                    pathname: '../reportDetail',
                    params: { ...item, latitude: String(item.latitude), longitude: String(item.longitude) },
                  })
                }
              >
                <Image source={{ uri: item.image_url }} style={styles.reportImage} />
                <View style={styles.reportTextContainer}>
                  <Text style={styles.reportText} numberOfLines={1}>
                    {item.issue_type === 'other' ? item.user_defined_issue_type : item.issue_type}
                  </Text>
                  <Text style={styles.reportAddress} numberOfLines={1}>{item.address}</Text>
                </View>
                {/* Stop propagation to prevent navigating when deleting */}
                <Pressable onPress={(e) => { e.stopPropagation(); handleDelete(item.id); }} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={22} color="#cc0000" />
                </Pressable>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>You have not submitted any reports yet.</Text>}
          />
        )}
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
  reportsSection: {
    flex: 1,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 24,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  reportImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  reportTextContainer: {
    flex: 1, // Allow this container to grow and fill space
  },
  reportText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    paddingLeft: 12, // Add padding to make the delete icon easier to tap
  },
  emptyText: { color: '#666', textAlign: 'center', marginTop: 20 },
  logoutButton: {
    margin: 24,
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