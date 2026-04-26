import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GeneratedOffer } from '../../types/index';
import { CountdownTimer } from './CountdownTimer';

interface OfferCardProps {
  offer: GeneratedOffer & { merchantName?: string };
}

/**
 * 3-second comprehension card (Req 14):
 * headline, discount, merchant name, walking distance, expiry — all visible without scrolling.
 */
export function OfferCard({ offer }: OfferCardProps): JSX.Element {
  return (
    <Pressable
      style={[styles.card, { backgroundColor: (offer.visualDesign?.primaryColor ?? '#4ECDC4') + '18' }]}
      onPress={() => router.push(`/offer/${offer.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${offer.content.headline}, ${offer.discountPercentage}% off at ${offer.merchantName ?? 'nearby merchant'}`}
    >
      {/* Row 1: discount badge + walking time (Req 14.1, 14.4) */}
      <View style={styles.topRow}>
        <View style={[styles.discountBadge, { backgroundColor: offer.visualDesign?.primaryColor ?? '#4ECDC4' }]}>
          <Text style={styles.discountText}>{offer.discountPercentage}% OFF</Text>
        </View>
        <Text style={styles.distance} accessibilityLabel={`${offer.walkingTimeMinutes} minute walk`}>
          🚶 {offer.walkingTimeMinutes} min
        </Text>
      </View>

      {/* Row 2: merchant name (Req 14.1) */}
      {offer.merchantName && (
        <Text style={styles.merchantName} numberOfLines={1}>{offer.merchantName}</Text>
      )}

      {/* Row 3: headline (Req 14.1) */}
      <Text style={styles.headline} numberOfLines={2}>{offer.content.headline}</Text>

      {/* Row 4: expiry countdown (Req 14.3, 26.3) */}
      <CountdownTimer expiresAt={offer.expiresAt} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  discountText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  distance: { color: '#6C757D', fontSize: 13 },
  merchantName: { fontSize: 13, fontWeight: '600', color: '#6C757D' },
  headline: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', lineHeight: 24 },
});
