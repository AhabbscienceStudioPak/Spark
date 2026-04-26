import React from 'react';
import type { ReactElement } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { GeneratedOffer } from '../../types/index';
import { CountdownTimer } from './CountdownTimer';
import { colors, radius, shadow, spacing, screen } from '../../theme/tokens';

interface OfferCardProps {
  offer: GeneratedOffer & { merchantName?: string };
}

export function OfferCard({ offer }: OfferCardProps): ReactElement {
  const visual = offer.visualDesign ?? offer.visual_design;
  const discount = offer.discountPercentage ?? offer.discount_percentage;
  const walkingMins = offer.walkingTimeMinutes ?? offer.walking_time_minutes;
  const expiresAt = offer.expiresAt ?? offer.expires_at ?? new Date().toISOString();
  const primaryColor = visual?.primaryColor ?? visual?.primary_color ?? colors.primary;
  const ctaLabel = `${offer.content.headline}, ${discount}% off at ${offer.merchantName ?? 'nearby merchant'}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/offer/${offer.id}`)}
      accessibilityRole="button"
      accessibilityLabel={ctaLabel}
    >
      {/* Colored accent bar */}
      <View style={[styles.accentBar, { backgroundColor: primaryColor }]} />

      <View style={styles.body}>
        {/* Top row: discount + distance */}
        <View style={styles.topRow}>
          <View style={[styles.discountBadge, { backgroundColor: primaryColor }]}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
          <View style={styles.distanceChip}>
            <Text style={styles.distanceText}>🚶 {walkingMins} min</Text>
          </View>
        </View>

        {/* Merchant name */}
        {offer.merchantName && (
          <Text style={styles.merchantName} numberOfLines={1}>{offer.merchantName}</Text>
        )}

        {/* Headline */}
        <Text style={styles.headline} numberOfLines={2}>{offer.content.headline}</Text>

        {/* Footer: countdown */}
        <View style={styles.footer}>
          <CountdownTimer expiresAt={expiresAt} compact />
          <Text style={styles.tapHint}>Tap to view →</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: screen.cardWidth,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadow.card,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  accentBar: { width: 5, borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountBadge: {
    borderRadius: radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  discountText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  distanceChip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  distanceText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  merchantName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  headline: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 23,
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  tapHint: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
});
