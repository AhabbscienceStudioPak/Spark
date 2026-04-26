import React, { useEffect } from 'react';
import type { ReactElement } from 'react';
import {
  View, FlatList, StyleSheet, Text, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOfferStore } from '../../store/offer.store';
import { useContextStore } from '../../store/context.store';
import { OfferCard } from '../../components/offers/OfferCard';
import { ContextBanner } from '../../components/context/ContextBanner';
import { LocationFallback } from '../../components/context/LocationFallback';
import { colors, spacing, typography } from '../../theme/tokens';

export default function OffersScreen(): ReactElement {
  const { offers, fetchOffers, isLoading: offersLoading } = useOfferStore();
  const {
    contextState, refreshContext, isLoading: contextLoading,
    locationDenied, setManualCity, degradedSources, startAutoRefresh,
  } = useContextStore();

  useEffect(() => {
    void refreshContext();
    const stop = startAutoRefresh();
    return stop;
  }, []);

  useEffect(() => {
    if (contextState) void fetchOffers(contextState);
  }, [contextState]);

  if (locationDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <LocationFallback onCitySelected={setManualCity} />
      </SafeAreaView>
    );
  }

  const isLoading = contextLoading || offersLoading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏙️ City Wallet</Text>
          <Text style={styles.headerSub}>Offers near you, right now</Text>
        </View>
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {/* Context chips */}
      {contextState && (
        <ContextBanner context={contextState} degradedSources={degradedSources} />
      )}

      {/* Loading skeleton */}
      {isLoading && !offers.length && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Finding offers near you…</Text>
        </View>
      )}

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OfferCard offer={item as typeof item & { merchantName?: string }} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏙️</Text>
              <Text style={styles.emptyTitle}>No offers right now</Text>
              <Text style={styles.emptySub}>
                Offers appear when nearby merchants have quiet periods. Pull down to refresh.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={() => void refreshContext()}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: typography.h2, fontWeight: '900', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  list: { padding: spacing.md, paddingTop: spacing.sm, flexGrow: 1 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 48,
  },
  loadingText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 48, gap: 12, minHeight: 300,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
