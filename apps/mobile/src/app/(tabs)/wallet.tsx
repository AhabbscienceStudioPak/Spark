import React, { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  RefreshControl, StatusBar,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { apiClient } from '../../services/api.client';
import { localOfferStorage } from '../../services/local-storage.service';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

interface WalletEntry {
  offer_id: string;
  merchant_name: string;
  discount_percentage: number;
  accepted_at: string;
  redeemed_at: string | null;
  status: string;
}

export default function WalletScreen(): ReactElement {
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadWallet = useCallback(async (): Promise<void> => {
    const db = SQLite.openDatabaseSync('gcw.db');
    const rows = await db.getAllAsync<WalletEntry>(
      'SELECT * FROM offer_history ORDER BY accepted_at DESC',
    );
    setEntries(rows);
    try {
      const consumerId = await localOfferStorage.getConsumerId();
      const res = await apiClient.get<{ data: { balance: number } }>(
        `/api/v1/checkout/wallet/${consumerId}`,
      );
      setBalance(res.data.data.balance);
    } catch {
      const redeemed = rows.filter((r) => r.status === 'redeemed');
      const estimated = redeemed.reduce((sum, r) => sum + 15 * (r.discount_percentage / 100), 0);
      setBalance(Math.round(estimated * 100) / 100);
    }
  }, []);

  useEffect(() => { void loadWallet(); }, [loadWallet]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const activeOffers = entries.filter((e) => e.status === 'accepted');
  const redeemedCount = entries.filter((e) => e.status === 'redeemed').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>💳 Wallet</Text>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Savings</Text>
        <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
          €{balance.toFixed(2)}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{redeemedCount}</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeOffers.length}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{entries.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Active Offers</Text>

      <FlatList
        data={activeOffers}
        keyExtractor={(item) => item.offer_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.entry, pressed && styles.entryPressed]}
            onPress={() => router.push(`/offer/${item.offer_id}`)}
            accessibilityRole="button"
          >
            <View style={styles.entryIcon}>
              <Text style={styles.entryIconText}>🏷️</Text>
            </View>
            <View style={styles.entryLeft}>
              <Text style={styles.merchantName} numberOfLines={1}>
                {item.merchant_name}
              </Text>
              <Text style={styles.entryDate}>
                {new Date(item.accepted_at).toLocaleDateString('de-DE')}
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.discount_percentage}%</Text>
              <Text style={styles.badgeOff}>OFF</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.empty}>No active offers</Text>
            <Text style={styles.emptySub}>
              Accept an offer from the Offers tab to see it here.
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: colors.text },

  balanceCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: 'center',
    gap: 6,
    ...shadow.lg,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    maxWidth: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 0,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  sectionTitle: {
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  list: { paddingHorizontal: spacing.md, flexGrow: 1, paddingBottom: 16 },

  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadow.sm,
  },
  entryPressed: { opacity: 0.88 },
  entryIcon: {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  entryIconText: { fontSize: 18 },
  entryLeft: { flex: 1, gap: 3, minWidth: 0 },
  merchantName: { fontSize: 15, fontWeight: '700', color: colors.text },
  entryDate: { fontSize: 12, color: colors.textMuted },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    flexShrink: 0,
    minWidth: 52,
  },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, lineHeight: 17 },
  badgeOff: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '700' },

  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  empty: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptySub: {
    fontSize: 14, color: colors.textMuted,
    textAlign: 'center', paddingHorizontal: 32, lineHeight: 22,
  },
});
