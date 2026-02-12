import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator, Alert } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SelectLocationScreen() {
  const router = useRouter();
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Region | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        const defaultRegion = {
          latitude: 40.7128,
          longitude: -74.006,
          latitudeDelta: 0.005,
          longitudeDelta: 0.0025,
        };
        setInitialRegion(defaultRegion);
        setSelectedLocation(defaultRegion);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.0025,
      };
      setInitialRegion(region);
      setSelectedLocation(region);
    })();
  }, []);

  const handleRegionChangeComplete = (region: Region) => {
    setSelectedLocation(region);
  };

  const confirmLocation = () => {
    if (!selectedLocation || !photoUri) return;
    router.push({
      pathname: './createReport',
      params: {
        photoUri,
        latitude: String(selectedLocation.latitude),
        longitude: String(selectedLocation.longitude),
      },
    });
  };

  if (!initialRegion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
      />
      <View style={styles.markerFixed}>
        <Ionicons name="pin" size={40} color="#EE4B2B" style={{ transform: [{ translateY: -20 }] }} />
      </View>
      <Pressable style={styles.confirmButton} onPress={confirmLocation}>
        <Text style={styles.confirmButtonText}>Confirm Location</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerFixed: {
    left: '50%',
    marginLeft: -20,
    marginTop: -20, // Adjusted for pin's visual center
    position: 'absolute',
    top: '50%',
  },
  confirmButton: {
    position: 'absolute',
    bottom: 34,
    left: 24,
    right: 24,
    backgroundColor: '#111',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});