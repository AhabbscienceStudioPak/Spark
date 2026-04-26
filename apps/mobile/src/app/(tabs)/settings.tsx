import React, { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  View, Text, StyleSheet, Switch, Pressable,
  ScrollView, Alert, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { useAuthStore } from '../../store/auth.store';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

export default function SettingsScreen(): ReactElement {
  const [maxOffersPerDay, setMaxOffersPerDay] = useState(5);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [pushEnabled, setPushEnabled] = useState(true);
  const { user, logout } = useAuthStore();

  useEffect(() => { void loadPreferences(); }, []);

  const loadPreferences = async (): Promise<void> => {
    const prefs = await SecureStore.getItemAsync('consumer_preferences');
    if (prefs) {
      const p = JSON.parse(prefs) as Record<string, unknown>;
      const parsedMax = typeof p.maxOffersPerDay === 'string'
        ? parseInt(p.maxOffersPerDay, 10) : Number(p.maxOffersPerDay);
      setMaxOffersPerDay(Number.isFinite(parsedMax) ? Math.min(10, Math.max(1, parsedMax)) : 5);
      const toBool = (v: unknown, fb: boolean) =>
        typeof v === 'boolean' ? v : typeof v === 'string' ? v === 'true' : fb;
      setDoNotDisturb(toBool(p.doNotDisturb, false));
      setLanguage(p.language === 'en' ? 'en' : 'de');
      setPushEnabled(toBool(p.pushEnabled, true));
    }
  };

  const save = async (updates: Partial<{
    maxOffersPerDay: number; doNotDisturb: boolean;
    language: 'de' | 'en'; pushEnabled: boolean;
  }>): Promise<void> => {
    const current = { maxOffersPerDay, doNotDisturb, language, pushEnabled, ...updates };
    await SecureStore.setItemAsync('consumer_preferences', JSON.stringify(current));
  };

  const handleDeleteData = (): void => {
    Alert.alert('Delete My Data', 'This will permanently delete all your local data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Everything', style: 'destructive',
        onPress: async () => {
          await Promise.all([
            SecureStore.deleteItemAsync('consumer_id'),
            SecureStore.deleteItemAsync('gdpr_consent'),
            SecureStore.deleteItemAsync('consumer_preferences'),
            SecureStore.deleteItemAsync('auth_token'),
            SecureStore.deleteItemAsync('refresh_token'),
            SecureStore.deleteItemAsync('auth_user'),
          ]);
          const db = SQLite.openDatabaseSync('gcw.db');
          await db.execAsync('DELETE FROM offer_history; DELETE FROM dismissals;');
          Alert.alert('Done', 'All your data has been deleted.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>⚙️ Settings</Text>

        {/* Account */}
        {user && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.accountRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.display_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.displayName} numberOfLines={1}>{user.display_name}</Text>
                <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
              </View>
              <View style={[
                styles.roleBadge,
                user.role === 'merchant' ? styles.roleMerchant : styles.roleConsumer,
              ]}>
                <Text style={[
                  styles.roleText,
                  user.role === 'merchant' ? styles.roleMerchantText : styles.roleConsumerText,
                ]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.dangerBtn}
              onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out', style: 'destructive',
                  onPress: async () => { await logout(); router.replace('/auth/login'); },
                },
              ])}
            >
              <Text style={styles.dangerBtnText}>🚪  Sign Out</Text>
            </Pressable>
          </View>
        )}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Text style={styles.rowSub}>Receive offers as push notifications</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(v) => { setPushEnabled(v); void save({ pushEnabled: v }); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Do Not Disturb</Text>
              <Text style={styles.rowSub}>Pause all offer notifications</Text>
            </View>
            <Switch
              value={doNotDisturb}
              onValueChange={(v) => { setDoNotDisturb(v); void save({ doNotDisturb: v }); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Offer Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Offer Preferences</Text>

          {/* Max offers — stacked layout to avoid overflow */}
          <View style={styles.stackRow}>
            <View style={styles.stackLeft}>
              <Text style={styles.rowLabel}>Max offers per day</Text>
              <Text style={styles.rowSub}>Limit how many offers you receive</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={styles.stepBtn}
                onPress={() => {
                  const v = Math.max(1, maxOffersPerDay - 1);
                  setMaxOffersPerDay(v);
                  void save({ maxOffersPerDay: v });
                }}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>{maxOffersPerDay}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => {
                  const v = Math.min(10, maxOffersPerDay + 1);
                  setMaxOffersPerDay(v);
                  void save({ maxOffersPerDay: v });
                }}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Language — stacked layout */}
          <View style={styles.stackRow}>
            <View style={styles.stackLeft}>
              <Text style={styles.rowLabel}>Language</Text>
              <Text style={styles.rowSub}>Offer content language</Text>
            </View>
            <View style={styles.langToggle}>
              {(['de', 'en'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  style={[styles.langBtn, language === lang && styles.langBtnActive]}
                  onPress={() => { setLanguage(lang); void save({ language: lang }); }}
                >
                  <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                    {lang === 'de' ? '🇩🇪 DE' : '🇬🇧 EN'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data (GDPR)</Text>
          <Text style={styles.privacyNote}>
            Your location and behavioral data is processed on-device only. Only abstract
            preference signals are sent to our servers.
          </Text>
          <Pressable style={styles.actionBtn} onPress={() => router.push('/privacy')}>
            <Text style={styles.actionBtnText}>🔒  Privacy Dashboard</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => Alert.alert(
              'Download My Data',
              'In production this would email you a JSON file. (GDPR Article 20)',
            )}
          >
            <Text style={styles.actionBtnText}>📥  Download My Data</Text>
          </Pressable>
          <Pressable style={styles.dangerBtn} onPress={handleDeleteData}>
            <Text style={styles.dangerBtnText}>🗑️  Delete My Account & Data</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Generative City Wallet v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  // Account
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 21, flexShrink: 0,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  accountInfo: { flex: 1, gap: 2, minWidth: 0 },
  displayName: { fontSize: 15, fontWeight: '700', color: colors.text },
  email: { fontSize: 12, color: colors.textMuted },
  roleBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  roleMerchant: { backgroundColor: '#FEF3C7' },
  roleConsumer: { backgroundColor: colors.primarySoft },
  roleText: { fontSize: 10, fontWeight: '800' },
  roleMerchantText: { color: '#92400E' },
  roleConsumerText: { color: colors.primary },

  separator: { height: 1, backgroundColor: colors.border },

  // Row with switch (fixed width right side)
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLeft: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  rowSub: { fontSize: 12, color: colors.textMuted },

  // Stacked row for stepper/lang (label on top, control below)
  stackRow: { gap: 10 },
  stackLeft: { gap: 2 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, color: colors.text, fontWeight: '700', lineHeight: 26 },
  stepValue: {
    fontSize: 20, fontWeight: '800', color: colors.text,
    minWidth: 32, textAlign: 'center',
  },

  // Language
  langToggle: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: radius.sm, backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
  },
  langBtnActive: { backgroundColor: colors.primary },
  langText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  langTextActive: { color: '#FFFFFF' },

  privacyNote: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  actionBtn: {
    backgroundColor: colors.surfaceMuted, borderRadius: radius.sm,
    padding: 14, alignItems: 'center',
  },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  dangerBtn: {
    backgroundColor: colors.dangerSoft, borderRadius: radius.sm,
    padding: 14, alignItems: 'center',
  },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: colors.danger },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12, paddingBottom: 8 },
});
