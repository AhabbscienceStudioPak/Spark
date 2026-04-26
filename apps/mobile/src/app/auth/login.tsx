import React, { useState } from 'react';
import type { ReactElement } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

export default function LoginScreen(): ReactElement {
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
    } catch { /* error set in store */ }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🏙️</Text>
            </View>
            <Text style={styles.appName}>City Wallet</Text>
            <Text style={styles.tagline}>Hyper-personalized local offers</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Sign In</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

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
                placeholderTextColor={colors.textMuted}
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
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.loginBtn, (!email || !password || isLoading) && styles.disabled]}
              onPress={handleLogin}
              disabled={!email || !password || isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.loginBtnText}>Sign In →</Text>
              }
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.registerBtn} onPress={() => router.push('/auth/register')}>
              <Text style={styles.registerBtnText}>Create an Account</Text>
            </Pressable>
          </View>

          {/* Demo hint */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo Credentials</Text>
            <Text style={styles.demoText}>consumer@demo.com / demo1234</Text>
            <Text style={styles.demoText}>merchant@demo.com / demo1234</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: spacing.md, justifyContent: 'center', gap: spacing.md },
  hero: { alignItems: 'center', gap: 10, paddingVertical: spacing.md },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    ...shadow.card,
  },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  errorBox: {
    backgroundColor: colors.dangerSoft, borderRadius: radius.sm,
    padding: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text },
  input: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    padding: 14, fontSize: 16, color: colors.text, backgroundColor: colors.bg,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: {
    borderWidth: 1.5, borderLeftWidth: 0, borderColor: colors.border,
    borderTopRightRadius: radius.sm, borderBottomRightRadius: radius.sm,
    padding: 14, backgroundColor: colors.bg,
  },
  eyeIcon: { fontSize: 18 },
  loginBtn: {
    backgroundColor: colors.primary, borderRadius: radius.sm,
    padding: 16, alignItems: 'center', ...shadow.sm,
  },
  loginBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 13 },
  registerBtn: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.sm,
    padding: 14, alignItems: 'center',
  },
  registerBtnText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  demoBox: {
    backgroundColor: '#EFF6FF', borderRadius: radius.sm,
    padding: 14, gap: 4, borderWidth: 1, borderColor: '#BFDBFE',
  },
  demoTitle: { fontSize: 11, fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  demoText: { fontSize: 13, color: '#3B82F6', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
