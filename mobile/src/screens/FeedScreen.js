import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getAllReports } from "../lib/api";

export default function FeedScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
  setLoading(true);
  getAllReports()
    .then(setReports)
    .catch((e) => setError(e.message ?? String(e)))
    .finally(() => setLoading(false));
    }

    useFocusEffect(
    useCallback(() => {
        load();
    }, [])
    );
  if (loading) {
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

  return (
    <View style={styles.container}>
        <Pressable style={styles.newBtn} onPress={() => navigation.navigate("ReportCamera")}>
            <Text style={styles.newBtnText}>+ New Report</Text>
        </Pressable>
      <FlatList
        data={reports}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("ReportDetail", { report: item })}
          >
            <Image source={{ uri: item.image_url }} style={styles.thumb} />
            <View style={styles.cardBody}>
              <View style={styles.row}>
                <Text style={styles.badge}>{item.issue_type.toUpperCase()}</Text>
                <Text style={styles.time}>{formatTimestamp(item.timestamp)}</Text>
              </View>

              <Text numberOfLines={2} style={styles.address}>
                {item.address}
              </Text>

              <Text style={styles.coords}>
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
              </Text>
            </View>
          </Pressable>
          
        )}
      />
    </View>
  );
}

function formatTimestamp(ts) {
  return ts.replace("T", " ").slice(0, 16);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  list: { padding: 16, paddingBottom: 24 },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#f2f2f2" },
  cardBody: { flex: 1, marginLeft: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  time: { fontSize: 12, color: "#666" },
  address: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  coords: { fontSize: 12, color: "#666" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "red", fontSize: 16, fontWeight: "600", textAlign: "center" },
  newBtn: {
  paddingVertical: 12,
  paddingHorizontal: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#ddd",
  marginBottom: 12,
    },
  newBtnText: { fontWeight: "700" },
});
