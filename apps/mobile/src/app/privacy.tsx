/**
 * Privacy Dashboard (Req 12.4):
 * Shows what data is processed locally vs sent to servers.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';

interface DataItem {
  label: string;
  location: 'on-device' | 'server';
  description: string;
}

const DATA_ITEMS: DataItem[] = [
  { label: 'GPS Coordinates', location: 'on-device', description: 'Raw location never leaves your device' },
  { label: 'Movement Patterns', location: 'on-device', description: 'Behavioral data stays local' },
  { label: 'Offer History', location: 'on-device', description: 'Stored in encrypted local SQLite' },
  { label: 'Dismissal Reasons', location: 'on-device', description: 'Preference learning is local-only' },
  { label: 'Intent Signals', location: 'server', description: 'Abstract signals only (e.g. "warm beverages")' },
  { label: 'Offer Tokens', location: 'server', description: 'Anonymized ID used for redemption' },
  { label: 'Redemption Records', location: 'server', description: 'Required for cashback and merchant reporting' },
  { label: 'Weather Context', location: 'server', description: 'City-level weather, not your exact location' },
];

export default function PrivacyDashboard(): JSX.Element {
  const onDevice = DATA_ITEMS.filter((d) => d.location === 'on-device');
  const onServer = DATA_ITEMS.filter((d) => d.location === 'server');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Privacy Dashboard</Text>
      <Text style={styles.subtitle}>
        City Wallet is designed with privacy by default. Here's exactly what stays on your device
        and what is sent to our servers.
      </Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📱</Text>
          <Text style={styles.sectionTitle}>Processed On-Device Only</Text>
        </View>
        <Text style={styles.sectionSub}>This data never leaves your phone</Text>
        {onDevice.map((item) => (
          <View key={item.label} style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
            <View style={[styles.badge, styles.localBadge]}>
              <Text style={styles.localBadgeText}>Local</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>☁️</Text>
          <Text style={styles.sectionTitle}>Sent to Servers</Text>
        </View>
        <Text style={styles.sectionSub}>Minimal data, anonymized where possible</Text>
        {onServer.map((item) => (
          <View key={item.label} style={styles.item}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
            <View style={[styles.badge, styles.serverBadge]}>
              <Text style={styles.serverBadgeText}>Server</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.gdprBox}>
        <Text style={styles.gdprTitle}>Your GDPR Rights</Text>
        <Text style={styles.gdprText}>
          You have the right to access, correct, and delete your data at any time.
          Go to Settings → Privacy to download or delete your data.
        </Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push('/(tabs)/settings')}
          accessibilityRole="button"
        >
          <Text style={styles.settingsBtnText}>Open Privacy Settings</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  backBtn: { paddingVertical: 8 },
  backText: { color: '#2D6A4F', fontWeight: '600', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 15, color: '#6C757D', lineHeight: 22 },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  sectionSub: { fontSize: 12, color: '#6C757D', marginTop: -8 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  itemLeft: { flex: 1, gap: 2 },
  itemLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  itemDesc: { fontSize: 12, color: '#6C757D' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  localBadge: { backgroundColor: '#D1FAE5' },
  localBadgeText: { color: '#065F46', fontSize: 11, fontWeight: '700' },
  serverBadge: { backgroundColor: '#FEF3C7' },
  serverBadgeText: { color: '#92400E', fontSize: 11, fontWeight: '700' },
  gdprBox: {
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, gap: 10,
  },
  gdprTitle: { fontSize: 15, fontWeight: '700', color: '#1E40AF' },
  gdprText: { fontSize: 13, color: '#3B82F6', lineHeight: 20 },
  settingsBtn: {
    backgroundColor: '#1E40AF', borderRadius: 10, padding: 12, alignItems: 'center',
  },
  settingsBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
