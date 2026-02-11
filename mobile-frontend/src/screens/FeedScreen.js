import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  Image, // Keep Image for custom marker
} from "react-native";
import MapView, { Marker } from "react-native-maps"; // Updated import
import { getAllReports } from "../lib/api";
import * as Location from "expo-location";

export default function FeedScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null); // [longitude, latitude]

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
      if (status !== "granted") {
        Alert.alert(
          "Permission to access location was denied",
          "The map will default to New York City."
        );
        setUserLocation([-74.006, 40.7128]); // Default to NYC [lon, lat]
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation([location.coords.longitude, location.coords.latitude]);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  if (loading || !userLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading reports…</Text>
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

  // Convert userLocation from [lon, lat] to { latitude, longitude } for initialRegion
  const initialRegion = {
    latitude: userLocation[1],
    longitude: userLocation[0],
    latitudeDelta: 0.0922, // Default zoom
    longitudeDelta: 0.0421, // Default zoom
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            onPress={() => navigation.navigate("ReportDetail", { report })}
          >
            <Image
              source={{ uri: report.image_url }}
              style={styles.annotationThumbnail}
            />
          </Marker>
        ))}
      </MapView>
      <Pressable
        style={styles.newBtn}
        onPress={() => navigation.navigate("ReportCamera")}
      >
        <Text style={styles.newBtnText}>+ New Report</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "red", fontSize: 16, fontWeight: "600", textAlign: "center" },
  newBtn: {
    position: "absolute",
    bottom: 24,
    right: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  newBtnText: { fontWeight: "700" },
  annotationThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20, // Make it circular
    borderWidth: 2,
    borderColor: "#fff",
    resizeMode: "cover",
  },
});
