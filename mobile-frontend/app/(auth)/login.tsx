import { useState, JSX, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
// import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/lib/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_STORAGE_KEY = 'neatstreet_biometric_credentials';

export default function LoginScreen(): JSX.Element {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  // const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);


  // useEffect(() => {
  //   // On screen load, check if biometrics are supported and if credentials are saved.
  //   (async () => {
  //     const hasHardware = await LocalAuthentication.hasHardwareAsync();
  //     const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  //     const savedCredentials = await SecureStore.getItemAsync(CREDENTIALS_STORAGE_KEY);
  //     if (hasHardware && isEnrolled && savedCredentials) {
  //       setIsBiometricAvailable(true);
  //     }
  //   })();
  // }, []);

  async function handleSubmit() {
    if (!username || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      // // After a successful login, check if we can offer to save credentials for biometrics.
      // const hasHardware = await LocalAuthentication.hasHardwareAsync();
      // const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      // if (hasHardware && isEnrolled) {
      //   Alert.alert(
      //     'Enable Biometric Login?',
      //     'Would you like to use Face ID / Touch ID to log in next time?',
      //     [
      //       { text: 'No', style: 'cancel' },
      //       {
      //         text: 'Yes',
      //         onPress: async () => {
      //           await SecureStore.setItemAsync(
      //             CREDENTIALS_STORAGE_KEY,
      //             JSON.stringify({ username, password })
      //           );
      //         },
      //       },
      //     ]
      //   );
      // }
    } catch (error: any) {
      Alert.alert('Error', error.body?.error || error.message);
    } finally {
      setLoading(false);
    }
  }

  // async function handleBiometricLogin() {
  //   const result = await LocalAuthentication.authenticateAsync({
  //     promptMessage: 'Log in to NeatStreet',
  //     // By setting this to true, we prevent the system from falling back to the device passcode.
  //     // This ensures that only biometric authentication (Face ID / Touch ID) is used.
  //     disableDeviceFallback: true,
  //   });

  //   if (result.success) {
  //     setLoading(true);
  //     try {
  //       const credsJson = await SecureStore.getItemAsync(CREDENTIALS_STORAGE_KEY);
  //       if (!credsJson) throw new Error('Biometric credentials not found.');
  //       const { username, password } = JSON.parse(credsJson);
  //       await login(username, password);
  //     } catch (error: any) {
  //       Alert.alert('Error', error.message || 'Biometric login failed.');
  //       setLoading(false);
  //     }
  //     // No finally block here, as loading should persist until navigation occurs.
  //   }
  //   else {
  //     // Provide feedback if the authentication was not successful (e.g., canceled by user).
  //     Alert.alert('Authentication Failed', result.error ? `Reason: ${result.error}` : 'Could not verify your identity.');
  //   }
  // }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="on-drag">
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/pave-logo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue reporting.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="Enter your username"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
          />

          <Pressable
            style={[styles.primaryBtn, loading && styles.disabled]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Log In</Text>
            )}
          </Pressable>

          {/* {isBiometricAvailable && (
            <Pressable style={styles.biometricBtn} onPress={handleBiometricLogin} disabled={loading}>
              <Ionicons name="finger-print" size={24} color="#111" />
              <Text style={styles.biometricBtnText}>Use Face ID / Touch ID</Text>
            </Pressable>
          )} */}

          <Pressable style={styles.secondaryBtn} onPress={() => router.push('./register')}>
            <Text style={styles.secondaryBtnText}>Don't have an account? Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 32, alignItems: 'center' },
  logo: {
    width: 180,
    height: 60,
    marginBottom: 24,
    contentFit: 'contain',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, backgroundColor: '#fafafa' },
  primaryBtn: { marginTop: 32, backgroundColor: '#FB8C00', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  secondaryBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
  secondaryBtnText: { color: '#111', fontSize: 14, fontWeight: '600' },
  biometricBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  biometricBtnText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});