/**
 * Main offers screen.
 * Req 1.5: 15-min auto-refresh
 * Req 2.5: location-denied fallback
 * Req 27.2: degraded context banner
 */
import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useOfferStore } from '../../store/offer.store';
import { useContextStore } from '../../store/context.store';
import { OfferCard } from '../../components/offers/OfferCard';
import { ContextBanner } from '../../components/context/ContextBanner';
import { LocationFallback } from '../../components/context/LocationFallback';

export default function OffersScreen(): JSX.Element {
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
    if (contextState) {
      void fetchOffers(contextState);
    }
  }, [contextState]);

  // Req 2.5: show city selector when location is denied
  if (locationDenied) {
    return (
      <View style={styles.container}>
        <LocationFallback onCitySelected={setManualCity} />
      </View>
    );
  }

  const isLoading = contextLoading || offersLoading;

  return (
    <View style={styles.container}>
      {/* Context banner (Req 27.2: shows degraded sources) */}
      {contextState && (
        <ContextBanner context={contextState} degradedSources={degradedSources} />
      )}

      {isLoading && !offers.length && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>Finding offers near you…</Text>
        </View>
      )}

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OfferCard offer={item as typeof item & { merchantName?: string }} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏙️</Text>
              <Text style={styles.emptyTitle}>No offers right now</Text>
              <Text style={styles.emptySub}>
                Offers appear when nearby merchants have quiet periods. Check back soon.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
        refreshing={isLoading}
        onRefresh={() => void refreshContext()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 48 },
  loadingText: { color: '#6C757D', fontSize: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#6C757D', textAlign: 'center', lineHeight: 22 },
});
