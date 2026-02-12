// This is a new file
import { useState, JSX, useEffect } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { classifyIssue } from '../src/lib/api';
export default function ReportCameraScreen(): JSX.Element {
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [classifying, setClassifying] = useState(false);

  async function takePhoto(): Promise<void> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera permission needed', 'Please enable camera access to take a report photo.');
      return;
    }


    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const uri = result.assets[0].uri;
    setPhotoUri(uri);
  }

  const [issueType, setIssueType] = useState<string | null>(null);
  useEffect(() => {
    async function classify() {
      if (!photoUri) return;
      setClassifying(true);
      try {
        const result = await classifyIssue(photoUri);
        setIssueType(result?.issue_type || null);
      } catch (e) {
        console.error('Classification failed', e);
      } finally {
        setClassifying(false);
      }
    }

    classify();
  }, [photoUri]);

  function useThisPhoto() {
    if (!photoUri) return;
    router.push(`./selectLocation?photoUri=${encodeURIComponent(photoUri)}&issueType=${encodeURIComponent(issueType ?? '')}`);
  }

  // UI from your old ReportCameraScreen.js
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Report</Text>
      <View style={styles.previewBox}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : <Text style={styles.placeholder}>No photo yet</Text>}
      </View>
      <Pressable style={styles.primaryBtn} onPress={takePhoto}>
        <Text style={styles.primaryBtnText}>{photoUri ? 'Retake Photo' : 'Take Photo'}</Text>
      </Pressable>
      <Pressable style={[styles.secondaryBtn, (!photoUri || classifying) && styles.disabled]} onPress={useThisPhoto} disabled={!photoUri || classifying}>
        {classifying ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.secondaryBtnText}>Use This Photo</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 64, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
  previewBox: { width: '100%', height: 360, borderRadius: 14, borderWidth: 1, borderColor: '#e5e5e5', backgroundColor: '#fafafa', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  preview: { width: '100%', height: '100%' },
  placeholder: { color: '#777' },
  primaryBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#111', backgroundColor: '#111', alignItems: 'center', marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
  secondaryBtnText: { color: '#111', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.4 },
});
