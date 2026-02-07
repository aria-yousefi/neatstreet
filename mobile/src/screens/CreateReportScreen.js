import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { classifyIssue, createUserReport } from "../lib/api";

const ISSUE_TYPES = ["pothole", "trash", "graffiti", "sidewalk", "other"];

export default function CreateReportScreen({ route, navigation }) {
  const photoUri = route.params?.photoUri;

    if (!photoUri) {
    return (
        <View style={styles.center}>
        <Text style={{ fontWeight: "700" }}>Missing photo</Text>
        <Text style={{ marginTop: 8, textAlign: "center" }}>
            Go back and tap “Use This Photo” again.
        </Text>
        </View>
    );
    }   

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [address, setAddress] = useState("");

  const [issueType, setIssueType] = useState("other");
  const [classificationNote, setClassificationNote] = useState("");

  const canSubmit = useMemo(
    () => !!photoUri && typeof latitude === "number" && typeof longitude === "number" && !submitting,
    [photoUri, latitude, longitude, submitting]
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        // 1) location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Location permission denied.");
        }

        const pos = await Location.getCurrentPositionAsync({});
        if (!isMounted) return;

        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);

        // 2) reverse geocode (best-effort)
        const places = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });

        if (!isMounted) return;

        if (places?.[0]) {
          const p = places[0];
          const pretty = [
            p.name,
            p.street,
            p.city,
            p.region,
            p.postalCode,
            p.country,
          ]
            .filter(Boolean)
            .join(", ");
          setAddress(pretty);
        }

        // 3) classify (best-effort; don’t block if it fails)
        try {
          const result = await classifyIssue(photoUri);
          if (!isMounted) return;

          const predicted = result?.issue_type;
          if (predicted) {
            setIssueType(predicted);
            setClassificationNote(`Auto-detected: ${predicted}`);
          } else {
            setClassificationNote("Auto-detection returned no label.");
          }
        } catch (e) {
          if (!isMounted) return;
          setClassificationNote("Auto-detection failed (you can still submit).");
        }
      } catch (e) {
        Alert.alert("Setup failed", e.message ?? String(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, [photoUri]);

  async function submit() {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await createUserReport({
        photoUri,
        lat: latitude,
        lon: longitude,
    });

      // Go back to feed and ask it to refresh
      navigation.navigate("Feed", { refresh: true });
    } catch (e) {
      Alert.alert("Submit failed", e.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Preparing report…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.hero} />

      <View style={styles.section}>
        <Text style={styles.label}>Issue Type</Text>
        <View style={styles.chipsRow}>
          {ISSUE_TYPES.map((t) => (
            <Pressable
              key={t}
              onPress={() => setIssueType(t)}
              style={[styles.chip, issueType === t && styles.chipSelected]}
            >
              <Text style={[styles.chipText, issueType === t && styles.chipTextSelected]}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {!!classificationNote && <Text style={styles.note}>{classificationNote}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>
          {latitude?.toFixed?.(5)}, {longitude?.toFixed?.(5)}
        </Text>

        {!!address && (
          <>
            <Text style={[styles.label, { marginTop: 10 }]}>Address</Text>
            <Text style={styles.value}>{address}</Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryBtn, !canSubmit && styles.disabled]}
          onPress={submit}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryBtnText}>{submitting ? "Submitting…" : "Submit Report"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  hero: { width: "100%", height: 260, backgroundColor: "#f2f2f2" },

  section: { paddingHorizontal: 16, paddingTop: 16 },
  label: { fontSize: 12, color: "#666", marginBottom: 8 },
  value: { fontSize: 15, fontWeight: "600" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  chipSelected: { borderColor: "#111", backgroundColor: "#111" },
  chipText: { fontWeight: "700", color: "#111" },
  chipTextSelected: { color: "#fff" },

  note: { marginTop: 10, color: "#666" },

  footer: { padding: 16, paddingTop: 24 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111",
    backgroundColor: "#111",
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.4 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#fff" },
});
