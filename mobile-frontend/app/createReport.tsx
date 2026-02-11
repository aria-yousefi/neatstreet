// This is a new file
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View, ActivityIndicator, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { classifyIssue, createUserReport } from '../src/lib/api'; // Adjusted import path

// Logic is from your old CreateReportScreen.js
const ISSUE_TYPES = ['pothole', 'trash', 'graffiti', 'sidewalk', 'other'];

export default function CreateReportScreen() {
  const router = useRouter();
  const { photoUri } = useLocalSearchParams<{ photoUri: string }>();

  if (!photoUri) {
    return (
      <View style={styles.center}>
        <Text style={{ fontWeight: '700' }}>Missing photo</Text>
        <Text style={{ marginTop: 8, textAlign: 'center' }}>Go back and tap “Use This Photo” again.</Text>
      </View>
    );
  }

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [issueType, setIssueType] = useState('other');
  const [userDefinedIssueType, setUserDefinedIssueType] = useState('');
  const [details, setDetails] = useState('');
  const [classificationNote, setClassificationNote] = useState('');

  const canSubmit = useMemo(
    () => !!photoUri && typeof latitude === 'number' && typeof longitude === 'number' && !submitting && !(issueType === 'other' && !userDefinedIssueType.trim()),
    [photoUri, latitude, longitude, submitting, issueType, userDefinedIssueType]
  );

  useEffect(() => {
    let isMounted = true;
    async function bootstrap() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLatitude(0); setLongitude(0); // Set to a non-null value
        } else {
          const pos = await Location.getCurrentPositionAsync({});
          if (!isMounted) return;
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          const places = await Location.reverseGeocodeAsync(pos.coords);
          if (isMounted && places?.[0]) {
            const p = places[0];
            setAddress([p.name, p.street, p.city, p.region, p.postalCode, p.country].filter(Boolean).join(', '));
          }
        }
        const result = await classifyIssue(photoUri as string);
        if (isMounted && result?.issue_type) {
          setIssueType(result.issue_type);
          setClassificationNote(`Auto-detected: ${result.issue_type}`);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    bootstrap();
    return () => { isMounted = false; };
  }, [photoUri]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createUserReport({ photoUri, lat: latitude!, lon: longitude!, user_defined_issue_type: issueType === 'other' ? userDefinedIssueType.trim() : undefined, details: details.trim() || undefined });
      router.replace({ pathname: '/', params: { refresh: 'true' } });
      Alert.alert('Report Submitted', 'Your report has been submitted successfully!');
    } catch (e: any) {
      Alert.alert('Submit failed', e.message ?? String(e));
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

  // JSX from your old CreateReportScreen.js
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag">
        <Image source={{ uri: photoUri }} style={styles.hero} />
        <View style={styles.section}>
          <Text style={styles.label}>Issue Type</Text>
          <View style={styles.chipsRow}>{ISSUE_TYPES.map((t) => (<Pressable key={t} onPress={() => setIssueType(t)} style={[styles.chip, issueType === t && styles.chipSelected]}><Text style={[styles.chipText, issueType === t && styles.chipTextSelected]}>{t}</Text></Pressable>))}</View>
          {issueType === 'other' && <TextInput placeholder="Name your issue (e.g., 'Broken Streetlight')" value={userDefinedIssueType} onChangeText={setUserDefinedIssueType} style={styles.textInput} autoCapitalize="words" />}
          {!!classificationNote && <Text style={styles.note}>{classificationNote}</Text>}
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Details (Optional)</Text>
          <TextInput placeholder="Add more details about the issue" value={details} onChangeText={setDetails} style={[styles.textInput, styles.detailsInput]} multiline />
        </View>
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{latitude?.toFixed?.(5)}, {longitude?.toFixed?.(5)}</Text>
          {!!address && (<><Text style={[styles.label, { marginTop: 10 }]}>Address</Text><Text style={styles.value}>{address}</Text></>)}
        </View>
        <View style={styles.footer}>
          <Pressable style={[styles.primaryBtn, !canSubmit && styles.disabled]} onPress={submit} disabled={!canSubmit}>
            <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit Report'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles from your old CreateReportScreen.js
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, scrollContent: { paddingBottom: 40 }, hero: { width: '100%', height: 260, backgroundColor: '#f2f2f2' }, section: { paddingHorizontal: 16, paddingTop: 16 }, label: { fontSize: 12, color: '#666', marginBottom: 8 }, value: { fontSize: 15, fontWeight: '600' }, chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff' }, chipSelected: { borderColor: '#111', backgroundColor: '#111' }, chipText: { fontWeight: '700', color: '#111' }, chipTextSelected: { color: '#fff' }, note: { marginTop: 10, color: '#666' }, footer: { padding: 16, paddingTop: 24 }, primaryBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#111', backgroundColor: '#111', alignItems: 'center' }, primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }, disabled: { opacity: 0.4 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' }, textInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, fontSize: 15 }, detailsInput: { minHeight: 80, textAlignVertical: 'top' },
});
