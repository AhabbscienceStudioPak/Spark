import React, { useState } from 'react';
import type { ReactElement } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

export default function RegisterScreen(): ReactElement {
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
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
              placeholderTextColor={colors.textMuted}
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
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  backBtn: { paddingVertical: 8 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  formTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  formSub: { fontSize: 14, color: colors.textMuted, marginTop: -8 },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: 12 },
  errorText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  hint: { fontWeight: '400', color: colors.textMuted },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    padding: 14, fontSize: 16, color: colors.text, backgroundColor: colors.surfaceMuted,
  },
  inputError: { borderColor: colors.danger },
  registerBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  registerBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  terms: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
