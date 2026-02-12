import { useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, Alert, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getAllReports, Report } from '../../src/lib/api'; // Adjusted import path
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router'; // Use useFocusEffect from expo-router

interface SimpleCoords {
  latitude: number;
  longitude: number;
}

export default function FeedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<SimpleCoords | null>(null);

  function load() {
    setLoading(true);
    getAllReports()
      .then(setReports)
      .catch((e) => setError(e.message ?? String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied', 'The map will default to a central location.');
        setUserLocation({ longitude: -74.006, latitude: 40.7128 }); // Default to NYC
        load();
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
      load();
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (params.refresh) {
        load();
      }
    }, [params.refresh])
  );

  if (!userLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Finding your location...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading reports...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        showsUserLocation
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.02,
        }}>
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            onPress={() =>
              router.push({
                pathname: './reportDetail',
                // All params must be strings for type safety, so we explicitly cast number types.
                params: { ...report, latitude: String(report.latitude), longitude: String(report.longitude) },
              })
            }
          >
            <Image source={{uri: report.image_url }} style={styles.annotationThumbnail} />
          </Marker>
        ))}
      </MapView>
      {/* Use a relative path for consistency */}
      <Pressable style={styles.newBtn} onPress={() => router.push('./camera')}>
        <Text style={styles.newBtnText}>+ New Report</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: 'red', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  newBtn: {
    position: 'absolute',
    bottom: 34,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 99,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  newBtnText: { fontWeight: '700', fontSize: 16 },
  annotationThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    resizeMode: 'cover',
  },
});
