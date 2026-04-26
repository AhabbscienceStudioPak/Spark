/**
 * Wallet screen — shows cashback balance and active accepted offers.
 * Balance fetched from API (real cashback when CASHBACK_MODE=true),
 * falls back to local estimate from SQLite.
 */
import React, { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import * as SQLite from 'expo-sqlite';
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

    // Try to get real cashback balance from API
    try {
      const consumerId = await localOfferStorage.getConsumerId();
      const res = await apiClient.get<{ data: { balance: number } }>(
        `/checkout/wallet/${consumerId}`,
      );
      setBalance(res.data.data.balance);
    } catch {
      // Fallback: estimate from local history (avg €15 basket)
      const redeemed = rows.filter((r) => r.status === 'redeemed');
      const estimated = redeemed.reduce(
        (sum, r) => sum + 15 * (r.discount_percentage / 100), 0,
      );
      setBalance(Math.round(estimated * 100) / 100);
    }
  }, []);

  useEffect(() => { void loadWallet(); }, [loadWallet]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const statusColor = (status: string): string => {
    if (status === 'redeemed') return colors.primary;
    if (status === 'accepted') return colors.accent;
    return colors.textMuted;
  };

  const activeOffers = entries.filter((e) => e.status === 'accepted');
  const redeemedCount = entries.filter((e) => e.status === 'redeemed').length;

  return (
    <View style={styles.container}>
      {/* Cashback balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Savings</Text>
        <Text style={styles.balanceAmount}>€{balance.toFixed(2)}</Text>
        <Text style={styles.balanceSub}>{redeemedCount} offer{redeemedCount !== 1 ? 's' : ''} redeemed</Text>
      </View>

      <Text style={styles.sectionTitle}>
        Active Offers {activeOffers.length > 0 && `(${activeOffers.length})`}
      </Text>

      <FlatList
        data={activeOffers}
        keyExtractor={(item) => item.offer_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D6A4F" />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.entry}
            onPress={() => router.push(`/offer/${item.offer_id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${item.merchant_name}, ${item.discount_percentage}% off`}
          >
            <View style={styles.entryLeft}>
              <Text style={styles.merchantName}>{item.merchant_name}</Text>
              <Text style={styles.entryDate}>
                Accepted {new Date(item.accepted_at).toLocaleDateString('de-DE')}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
              <Text style={styles.badgeText}>{item.discount_percentage}% OFF</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💳</Text>
            <Text style={styles.empty}>No active offers.</Text>
            <Text style={styles.emptySub}>Accept an offer from the Offers tab to see it here.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  balanceCard: {
    margin: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: 4,
    ...shadow.card,
  },
  balanceLabel: { color: '#B7E4C7', fontSize: 14, fontWeight: '600' },
  balanceAmount: { color: '#FFFFFF', fontSize: 48, fontWeight: '900' },
  balanceSub: { color: '#B7E4C7', fontSize: 13 },
  sectionTitle: { paddingHorizontal: spacing.md, paddingBottom: 8, fontSize: 16, fontWeight: '800', color: colors.text },
  list: { paddingHorizontal: spacing.md, gap: spacing.sm, flexGrow: 1 },
  entry: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  entryLeft: { gap: 4, flex: 1 },
  merchantName: { fontSize: 15, fontWeight: '700', color: colors.text },
  entryDate: { fontSize: 12, color: colors.textMuted },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 64, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  empty: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});
