import React from 'react';
import type { ReactElement } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GeneratedOffer } from '../../types/index';
import { CountdownTimer } from './CountdownTimer';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

interface OfferCardProps {
  offer: GeneratedOffer & { merchantName?: string };
}

/**
 * 3-second comprehension card (Req 14):
 * headline, discount, merchant name, walking distance, expiry — all visible without scrolling.
 */
export function OfferCard({ offer }: OfferCardProps): ReactElement {
  const visual = offer.visualDesign ?? offer.visual_design;
  const discount = offer.discountPercentage ?? offer.discount_percentage;
  const walkingMins = offer.walkingTimeMinutes ?? offer.walking_time_minutes;
  const expiresAt = offer.expiresAt ?? offer.expires_at ?? new Date().toISOString();
  const ctaLabel = `${offer.content.headline}, ${discount}% off at ${offer.merchantName ?? 'nearby merchant'}`;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: (visual?.primaryColor ?? visual?.primary_color ?? '#4ECDC4') + '18' }]}
      onPress={() => router.push(`/offer/${offer.id}`)}
      accessibilityRole="button"
      accessibilityLabel={ctaLabel}
    >
      {/* Row 1: discount badge + walking time (Req 14.1, 14.4) */}
      <View style={styles.topRow}>
        <View style={[styles.discountBadge, { backgroundColor: visual?.primaryColor ?? visual?.primary_color ?? colors.primary }]}>
          <Text style={styles.discountText}>{discount}% OFF</Text>
        </View>
        <Text style={styles.distance} accessibilityLabel={`${walkingMins} minute walk`}>
          🚶 {walkingMins} min
        </Text>
      </View>

      {/* Row 2: merchant name (Req 14.1) */}
      {offer.merchantName && (
        <Text style={styles.merchantName} numberOfLines={1}>{offer.merchantName}</Text>
      )}

      {/* Row 3: headline (Req 14.1) */}
      <Text style={styles.headline} numberOfLines={2}>{offer.content.headline}</Text>

      {/* Row 4: expiry countdown (Req 14.3, 26.3) */}
      <CountdownTimer expiresAt={expiresAt} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountBadge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  discountText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  distance: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  merchantName: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  headline: { fontSize: 18, fontWeight: '800', color: colors.text, lineHeight: 24 },
});
