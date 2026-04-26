import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, Pressable, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { useAuthStore } from '../../store/auth.store';

export default function SettingsScreen(): JSX.Element {
  const [maxOffersPerDay, setMaxOffersPerDay] = useState(5);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [language, setLanguage] = useState<'de' | 'en'>('de');
  const [pushEnabled, setPushEnabled] = useState(true);
  const { user, logout } = useAuthStore();

  useEffect(() => { void loadPreferences(); }, []);

  const loadPreferences = async (): Promise<void> => {
    const prefs = await SecureStore.getItemAsync('consumer_preferences');
    if (prefs) {
      const parsed = JSON.parse(prefs) as {
        maxOffersPerDay: number; doNotDisturb: boolean;
        language: 'de' | 'en'; pushEnabled: boolean;
      };
      setMaxOffersPerDay(parsed.maxOffersPerDay ?? 5);
      setDoNotDisturb(parsed.doNotDisturb ?? false);
      setLanguage(parsed.language ?? 'de');
      setPushEnabled(parsed.pushEnabled ?? true);
    }
  };

  const savePreferences = async (updates: Partial<{
    maxOffersPerDay: number; doNotDisturb: boolean;
    language: 'de' | 'en'; pushEnabled: boolean;
  }>): Promise<void> => {
    const current = { maxOffersPerDay, doNotDisturb, language, pushEnabled, ...updates };
    await SecureStore.setItemAsync('consumer_preferences', JSON.stringify(current));
  };

  const handleDeleteData = (): void => {
    Alert.alert(
      'Delete My Data',
      'This will permanently delete all your local data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything', style: 'destructive',
          onPress: async () => {
            await SecureStore.deleteItemAsync('consumer_id');
            await SecureStore.deleteItemAsync('gdpr_consent');
            await SecureStore.deleteItemAsync('consumer_preferences');
            await SecureStore.deleteItemAsync('auth_token');
            await SecureStore.deleteItemAsync('refresh_token');
            await SecureStore.deleteItemAsync('auth_user');
            const db = SQLite.openDatabaseSync('gcw.db');
            await db.execAsync('DELETE FROM offer_history; DELETE FROM dismissals;');
            Alert.alert('Done', 'All your data has been deleted.');
          },
        },
      ],
    );
  };

  const handleDownloadData = (): void => {
    Alert.alert(
      'Download My Data',
      'Your data export will be prepared. (GDPR Article 20)\n\nIn production this would email you a JSON file.',
      [{ text: 'OK' }],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {/* Account */}
      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>{user.display_name}</Text>
              <Text style={styles.rowSub}>{user.email}</Text>
            </View>
            <View style={[styles.badge, {
              backgroundColor: user.role === 'merchant' ? '#FEF3C7' : '#D1FAE5',
            }]}>
              <Text style={{
                fontSize: 11, fontWeight: '700',
                color: user.role === 'merchant' ? '#92400E' : '#065F46',
              }}>
                {user.role.toUpperCase()}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.actionBtn, styles.dangerBtn]}
            onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: async () => {
                await logout();
                router.replace('/auth/login');
              }},
            ])}
            accessibilityRole="button"
          >
            <Text style={[styles.actionBtnText, styles.dangerText]}>🚪 Sign Out</Text>
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
            onValueChange={(v) => { setPushEnabled(v); void savePreferences({ pushEnabled: v }); }}
            trackColor={{ true: '#2D6A4F' }}
            accessibilityLabel="Toggle push notifications"
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Do Not Disturb</Text>
            <Text style={styles.rowSub}>Pause all offer notifications</Text>
          </View>
          <Switch
            value={doNotDisturb}
            onValueChange={(v) => { setDoNotDisturb(v); void savePreferences({ doNotDisturb: v }); }}
            trackColor={{ true: '#2D6A4F' }}
            accessibilityLabel="Toggle do not disturb"
          />
        </View>
      </View>

      {/* Offer preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offer Preferences</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Max offers per day</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => { const v = Math.max(1, maxOffersPerDay - 1); setMaxOffersPerDay(v); void savePreferences({ maxOffersPerDay: v }); }}
              accessibilityLabel="Decrease max offers"
            >
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.stepValue}>{maxOffersPerDay}</Text>
            <Pressable
              style={styles.stepBtn}
              onPress={() => { const v = Math.min(10, maxOffersPerDay + 1); setMaxOffersPerDay(v); void savePreferences({ maxOffersPerDay: v }); }}
              accessibilityLabel="Increase max offers"
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Language</Text>
          <View style={styles.langToggle}>
            {(['de', 'en'] as const).map((lang) => (
              <Pressable
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => { setLanguage(lang); void savePreferences({ language: lang }); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: language === lang }}
              >
                <Text style={[styles.langText, language === lang && styles.langTextActive]}>
                  {lang.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Privacy & GDPR */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Data (GDPR)</Text>
        <Text style={styles.privacyNote}>
          Your location and behavioral data is processed on-device only. Only abstract preference
          signals are sent to our servers.
        </Text>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/privacy')} accessibilityRole="button">
          <Text style={styles.actionBtnText}>🔒 Privacy Dashboard</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={handleDownloadData} accessibilityRole="button">
          <Text style={styles.actionBtnText}>📥 Download My Data</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={handleDeleteData} accessibilityRole="button">
          <Text style={[styles.actionBtnText, styles.dangerText]}>🗑️ Delete My Account & Data</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>Generative City Wallet v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6C757D', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, color: '#1A1A2E', fontWeight: '500' },
  rowSub: { fontSize: 12, color: '#6C757D' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E9ECEF', alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, color: '#1A1A2E', fontWeight: '700' },
  stepValue: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', minWidth: 24, textAlign: 'center' },
  langToggle: { flexDirection: 'row', gap: 8 },
  langBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E9ECEF' },
  langBtnActive: { backgroundColor: '#2D6A4F' },
  langText: { fontSize: 14, fontWeight: '700', color: '#6C757D' },
  langTextActive: { color: '#FFFFFF' },
  privacyNote: { fontSize: 13, color: '#6C757D', lineHeight: 20 },
  actionBtn: { backgroundColor: '#E9ECEF', borderRadius: 10, padding: 14, alignItems: 'center' },
  dangerBtn: { backgroundColor: '#FFF0F0' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  dangerText: { color: '#E63946' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  version: { textAlign: 'center', color: '#ADB5BD', fontSize: 12 },
});
