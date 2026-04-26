import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';

export default function RegisterScreen(): JSX.Element {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async (): Promise<void> => {
    clearError();
    setValidationError('');

    if (!displayName.trim()) { setValidationError('Please enter your name.'); return; }
    if (!email.trim()) { setValidationError('Please enter your email.'); return; }
    if (password.length < 8) { setValidationError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setValidationError('Passwords do not match.'); return; }

    try {
      await register(email.trim().toLowerCase(), password, displayName.trim());
      router.replace('/(tabs)');
    } catch {
      // error is set in the store
    }
  };

  const displayedError = validationError || error;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.backText}>← Back to Sign In</Text>
        </Pressable>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Account</Text>
          <Text style={styles.formSub}>Start receiving personalized local offers</Text>

          {displayedError && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>{displayedError}</Text>
            </View>
          )}

          <Field label="Your Name">
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="e.g. Mia Schmidt"
              placeholderTextColor="#ADB5BD"
              accessibilityLabel="Display name"
            />
          </Field>

          <Field label="Email">
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              placeholderTextColor="#ADB5BD"
              accessibilityLabel="Email address"
            />
          </Field>

          <Field label="Password" hint="Minimum 8 characters">
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
              placeholderTextColor="#ADB5BD"
              accessibilityLabel="Password"
            />
          </Field>

          <Field label="Confirm Password">
            <TextInput
              style={[styles.input, confirmPassword && password !== confirmPassword && styles.inputError]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              placeholder="••••••••"
              placeholderTextColor="#ADB5BD"
              accessibilityLabel="Confirm password"
              onSubmitEditing={handleRegister}
              returnKeyType="go"
            />
          </Field>

          <Pressable
            style={[styles.registerBtn, (!displayName || !email || !password || isLoading) && styles.disabled]}
            onPress={handleRegister}
            disabled={!displayName || !email || !password || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account</Text>
            )}
          </Pressable>

          <Text style={styles.terms}>
            By creating an account you agree to our Privacy Policy. Your location data stays on your device.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}{hint && <Text style={styles.hint}> — {hint}</Text>}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flexGrow: 1, padding: 24, gap: 20 },
  backBtn: { paddingVertical: 8 },
  backText: { color: '#2D6A4F', fontWeight: '600', fontSize: 15 },
  form: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  formTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A2E' },
  formSub: { fontSize: 14, color: '#6C757D', marginTop: -8 },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12 },
  errorText: { color: '#E63946', fontSize: 14, fontWeight: '500' },
  label: { fontSize: 14, fontWeight: '600', color: '#495057' },
  hint: { fontWeight: '400', color: '#ADB5BD' },
  input: {
    borderWidth: 1.5, borderColor: '#DEE2E6', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#1A1A2E', backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#E63946' },
  registerBtn: {
    backgroundColor: '#2D6A4F', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  registerBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  terms: { fontSize: 12, color: '#ADB5BD', textAlign: 'center', lineHeight: 18 },
});
