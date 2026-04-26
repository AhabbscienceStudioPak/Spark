import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';

export default function LoginScreen(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async (): Promise<void> => {
    if (!email.trim() || !password) return;
    clearError();
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch {
      // error is set in the store
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo / branding */}
        <View style={styles.hero}>
          <Text style={styles.logo}>🏙️</Text>
          <Text style={styles.appName}>City Wallet</Text>
          <Text style={styles.tagline}>Hyper-personalized local offers</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign In</Text>

          {error && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
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
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor="#ADB5BD"
                accessibilityLabel="Password"
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.loginBtn, (!email || !password || isLoading) && styles.disabled]}
            onPress={handleLogin}
            disabled={!email || !password || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.registerBtn}
            onPress={() => router.push('/auth/register')}
            accessibilityRole="button"
          >
            <Text style={styles.registerBtnText}>Create an Account</Text>
          </Pressable>
        </View>

        {/* Demo credentials hint */}
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>Demo credentials</Text>
          <Text style={styles.demoText}>consumer@demo.com / demo1234</Text>
          <Text style={styles.demoText}>merchant@demo.com / demo1234</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 24 },
  hero: { alignItems: 'center', gap: 8 },
  logo: { fontSize: 64 },
  appName: { fontSize: 32, fontWeight: '900', color: '#1A1A2E' },
  tagline: { fontSize: 15, color: '#6C757D' },
  form: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  errorBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12 },
  errorText: { color: '#E63946', fontSize: 14, fontWeight: '500' },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#495057' },
  input: {
    borderWidth: 1.5, borderColor: '#DEE2E6', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#1A1A2E', backgroundColor: '#FAFAFA',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: {
    borderWidth: 1.5, borderLeftWidth: 0, borderColor: '#DEE2E6',
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    padding: 14, backgroundColor: '#FAFAFA',
  },
  eyeIcon: { fontSize: 18 },
  loginBtn: {
    backgroundColor: '#2D6A4F', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E9ECEF' },
  dividerText: { color: '#ADB5BD', fontSize: 13 },
  registerBtn: {
    borderWidth: 1.5, borderColor: '#2D6A4F', borderRadius: 14,
    padding: 14, alignItems: 'center',
  },
  registerBtnText: { color: '#2D6A4F', fontSize: 16, fontWeight: '700' },
  demoBox: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, gap: 4,
  },
  demoTitle: { fontSize: 12, fontWeight: '700', color: '#1E40AF', textTransform: 'uppercase' },
  demoText: { fontSize: 13, color: '#3B82F6', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
