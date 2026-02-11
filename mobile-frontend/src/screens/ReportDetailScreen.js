import { Image, StyleSheet, Text, View, ScrollView } from "react-native";

export default function ReportDetailScreen({ route }) {
  const { report } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: report.image_url }} style={styles.hero} />

      <View style={styles.section}>
        <Text style={styles.title}>
          {report.issue_type === "other" && report.user_defined_issue_type
            ? report.user_defined_issue_type.toUpperCase()
            : report.issue_type.toUpperCase()}
        </Text>
        <Text style={styles.meta}>{formatTimestamp(report.timestamp)}</Text>
      </View>

      {report.details && (
        <View style={styles.section}>
          <Text style={styles.label}>Details</Text>
          <Text style={styles.value}>{report.details}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Address</Text>
        <Text style={styles.value}>{report.address}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Coordinates</Text>
        <Text style={styles.value}>
          {report.latitude}, {report.longitude}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Image filename</Text>
        <Text style={styles.value}>{report.image_filename}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Report ID</Text>
        <Text style={styles.value}>{report.id}</Text>
      </View>
    </ScrollView>
  );
}

function formatTimestamp(ts) {
  return ts.replace("T", " ").slice(0, 16);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingBottom: 24 },
  hero: { width: "100%", height: 280, backgroundColor: "#f2f2f2" },
  section: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: "800" },
  meta: { marginTop: 6, color: "#666" },
  label: { fontSize: 12, color: "#666", marginBottom: 6 },
  value: { fontSize: 16, fontWeight: "600" },
});
r