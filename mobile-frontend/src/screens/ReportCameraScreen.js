import { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function ReportCameraScreen({ navigation }) {
  const [photoUri, setPhotoUri] = useState(null);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera permission needed", "Please enable camera access to take a report photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
  quality: 0.8,
  allowsEditing: false, // <-- change to false for now
});

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    setPhotoUri(uri);
  }

  function useThisPhoto() {
    if (!photoUri) return;
    // later: navigate to "CreateReport" screen with this photo
    navigation.navigate("CreateReport", { photoUri });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Report</Text>

      <View style={styles.previewBox}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} />
        ) : (
          <Text style={styles.placeholder}>No photo yet</Text>
        )}
      </View>

      <Pressable style={styles.primaryBtn} onPress={takePhoto}>
        <Text style={styles.primaryBtnText}>{photoUri ? "Retake Photo" : "Take Photo"}</Text>
      </Pressable>

      <Pressable
        style={[styles.secondaryBtn, !photoUri && styles.disabled]}
        onPress={useThisPhoto}
        disabled={!photoUri}
      >
        <Text style={styles.secondaryBtnText}>Use This Photo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 64, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 16 },
  previewBox: {
    width: "100%",
    height: 360,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    backgroundColor: "#fafafa",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  preview: { width: "100%", height: "100%" },
  placeholder: { color: "#777" },

  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#111",
    backgroundColor: "#111",
    alignItems: "center",
    marginBottom: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  secondaryBtnText: { color: "#111", fontWeight: "700", fontSize: 16 },

  disabled: { opacity: 0.4 },
});
