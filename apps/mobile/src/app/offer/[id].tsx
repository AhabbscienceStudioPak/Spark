import React, { useState } from 'react';
import type { ReactElement } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useOfferStore } from '../../store/offer.store';
import { CountdownTimer } from '../../components/offers/CountdownTimer';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

// Req 17.1: dismissal reason options
const DISMISSAL_REASONS = [
  { key: 'not_interested_merchant', label: 'Not interested in this merchant' },
  { key: 'not_interested_product', label: 'Not interested in the product' },
  { key: 'bad_timing', label: 'Bad timing' },
  { key: 'other', label: 'Other' },
] as const;

type DismissalKey = typeof DISMISSAL_REASONS[number]['key'];

export default function OfferDetailScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { offers, acceptOffer, dismissOffer } = useOfferStore();
  const offer = offers.find((o) => o.id === id) as (typeof offers[0] & { merchantName?: string; merchantLat?: number; merchantLng?: number }) | undefined;

  const [showDismissModal, setShowDismissModal] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  if (!offer) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Offer not found or has expired.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleAccept = async (): Promise<void> => {
    setIsAccepting(true);
    await acceptOffer(offer.id);
    router.push(`/checkout/${offer.id}`);
  };

  const handleDismiss = (reason: DismissalKey): void => {
    setShowDismissModal(false);
    void dismissOffer(offer.id, reason);
    router.back();
  };

  // Req 16.3: navigation option to merchant location
  const openMaps = (): void => {
    if (offer.merchantLat && offer.merchantLng) {
      const url = `https://maps.google.com/?q=${offer.merchantLat},${offer.merchantLng}`;
      void Linking.openURL(url);
    }
  };

  const visual = offer.visualDesign ?? offer.visual_design;
  const walkingMins = offer.walkingTimeMinutes ?? offer.walking_time_minutes;
  const discount = offer.discountPercentage ?? offer.discount_percentage;
  const expiresAt = offer.expiresAt ?? offer.expires_at;
  const callToAction = offer.content.callToAction ?? offer.content.call_to_action;
  const bgColor = visual?.backgroundColor ?? visual?.background_color ?? colors.bg;
  const primaryColor = visual?.primaryColor ?? visual?.primary_color ?? colors.primary;

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: bgColor }]} contentContainerStyle={styles.content}>
        {/* Merchant name + distance (Req 14.1, 14.4) */}
        <View style={styles.merchantRow}>
          <Text style={styles.merchantName}>{offer.merchantName ?? 'Nearby Merchant'}</Text>
          <Pressable onPress={openMaps} accessibilityRole="link" accessibilityLabel="Open in Maps">
            <Text style={styles.mapLink}>🗺 {walkingMins} min walk</Text>
          </Pressable>
        </View>

        {/* Headline (Req 14.1) */}
        <Text style={styles.headline}>{offer.content.headline}</Text>

        {/* Discount — prominent (Req 14.1) */}
        <View style={[styles.discountBox, { backgroundColor: primaryColor }]}>
          <Text style={styles.discountNumber}>{discount}%</Text>
          <Text style={styles.discountOff}>OFF</Text>
        </View>

        {/* Description */}
        <Text style={styles.description}>{offer.content.description}</Text>

        {/* Expiry countdown — prominent (Req 14.3, 26.3) */}
        <View style={styles.expiryRow}>
          <Text style={styles.expiryLabel}>⏱ Valid for:</Text>
          <CountdownTimer expiresAt={expiresAt} />
        </View>

        {/* Accept button (Req 16.1) */}
        <Pressable
          style={[styles.acceptButton, { backgroundColor: primaryColor }, isAccepting && styles.disabled]}
          onPress={handleAccept}
          disabled={isAccepting}
          accessibilityRole="button"
          accessibilityLabel={callToAction}
        >
          <Text style={styles.acceptText}>
            {isAccepting ? 'Generating code…' : callToAction}
          </Text>
        </Pressable>

        {/* Dismiss button (Req 17.1) */}
        <Pressable
          style={styles.dismissButton}
          onPress={() => setShowDismissModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Not interested"
        >
          <Text style={styles.dismissText}>Not interested</Text>
        </Pressable>
      </ScrollView>

      {/* Dismissal reason modal (Req 17.1) */}
      <Modal
        visible={showDismissModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDismissModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Why are you dismissing this?</Text>
            <Text style={styles.modalSub}>Optional — helps us improve your offers</Text>
            {DISMISSAL_REASONS.map((r) => (
              <Pressable
                key={r.key}
                style={styles.reasonBtn}
                onPress={() => handleDismiss(r.key)}
                accessibilityRole="button"
              >
                <Text style={styles.reasonText}>{r.label}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.skipBtn}
              onPress={() => handleDismiss('other')}
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: 48 },
  notFound: { padding: 32, textAlign: 'center', color: colors.textMuted, fontSize: 16 },
  backBtn: { margin: 24, padding: 12, alignItems: 'center' },
  backBtnText: { color: colors.primary, fontWeight: '700' },
  merchantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchantName: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  mapLink: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  headline: { fontSize: 26, fontWeight: '800', color: colors.text, lineHeight: 32 },
  discountBox: {
    borderRadius: radius.md, padding: 20, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    ...shadow.card,
  },
  discountNumber: { color: '#FFFFFF', fontSize: 56, fontWeight: '900', lineHeight: 60 },
  discountOff: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', alignSelf: 'flex-end', paddingBottom: 8 },
  description: { fontSize: 16, color: colors.text, lineHeight: 26 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiryLabel: { fontSize: 14, color: colors.textMuted },
  acceptButton: { borderRadius: radius.md, padding: 18, alignItems: 'center' },
  acceptText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  dismissButton: { padding: 12, alignItems: 'center' },
  dismissText: { color: colors.textMuted, fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  reasonBtn: {
    backgroundColor: colors.bg, borderRadius: radius.sm, padding: 16,
  },
  reasonText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  skipBtn: { padding: 12, alignItems: 'center' },
  skipText: { color: colors.textMuted, fontSize: 14 },
});
