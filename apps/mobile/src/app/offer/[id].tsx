import React, { useState } from 'react';
import type { ReactElement } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, Linking, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useOfferStore } from '../../store/offer.store';
import { CountdownTimer } from '../../components/offers/CountdownTimer';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

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
  const offer = offers.find((o) => o.id === id) as (typeof offers[0] & {
    merchantName?: string; merchantLat?: number; merchantLng?: number;
  }) | undefined;

  const [showDismissModal, setShowDismissModal] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  if (!offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundEmoji}>🔍</Text>
          <Text style={styles.notFoundTitle}>Offer not found</Text>
          <Text style={styles.notFoundSub}>This offer may have expired.</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
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

  const openMaps = (): void => {
    if (offer.merchantLat && offer.merchantLng) {
      void Linking.openURL(`https://maps.google.com/?q=${offer.merchantLat},${offer.merchantLng}`);
    }
  };

  const visual = offer.visualDesign ?? offer.visual_design;
  const walkingMins = offer.walkingTimeMinutes ?? offer.walking_time_minutes;
  const discount = offer.discountPercentage ?? offer.discount_percentage;
  const expiresAt = offer.expiresAt ?? offer.expires_at;
  const callToAction = offer.content.callToAction ?? offer.content.call_to_action ?? 'Redeem Now';
  const primaryColor = visual?.primaryColor ?? visual?.primary_color ?? colors.primary;

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        {/* Back button */}
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Merchant + distance */}
          <View style={styles.merchantRow}>
            <View style={styles.merchantIcon}>
              <Text style={styles.merchantIconText}>🏪</Text>
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{offer.merchantName ?? 'Nearby Merchant'}</Text>
              <Pressable onPress={openMaps}>
                <Text style={styles.mapLink}>🗺 {walkingMins} min walk · Open in Maps</Text>
              </Pressable>
            </View>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>{offer.content.headline}</Text>

          {/* Discount hero */}
          <View style={[styles.discountHero, { backgroundColor: primaryColor }]}>
            <Text style={styles.discountNumber}>{discount}%</Text>
            <Text style={styles.discountOff}>OFF</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{offer.content.description}</Text>

          {/* Expiry */}
          <View style={styles.expiryCard}>
            <Text style={styles.expiryLabel}>⏱ Expires in</Text>
            <CountdownTimer expiresAt={expiresAt} />
          </View>

          {/* Accept CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.acceptButton,
              { backgroundColor: primaryColor },
              (isAccepting || pressed) && styles.btnPressed,
            ]}
            onPress={handleAccept}
            disabled={isAccepting}
          >
            <Text style={styles.acceptText}>
              {isAccepting ? '⏳ Generating code…' : callToAction}
            </Text>
          </Pressable>

          {/* Dismiss */}
          <Pressable style={styles.dismissButton} onPress={() => setShowDismissModal(true)}>
            <Text style={styles.dismissText}>Not interested</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      {/* Dismiss modal */}
      <Modal
        visible={showDismissModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDismissModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Why are you dismissing this?</Text>
            <Text style={styles.modalSub}>Helps us improve your offers</Text>
            {DISMISSAL_REASONS.map((r) => (
              <Pressable
                key={r.key}
                style={({ pressed }) => [styles.reasonBtn, pressed && styles.reasonBtnPressed]}
                onPress={() => handleDismiss(r.key)}
              >
                <Text style={styles.reasonText}>{r.label}</Text>
                <Text style={styles.reasonArrow}>›</Text>
              </Pressable>
            ))}
            <Pressable style={styles.skipBtn} onPress={() => setShowDismissModal(false)}>
              <Text style={styles.skipText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  backArrow: { fontSize: 20, color: colors.primary, fontWeight: '700' },
  backLabel: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  notFoundEmoji: { fontSize: 52 },
  notFoundTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  notFoundSub: { fontSize: 15, color: colors.textMuted },
  backBtn: { marginTop: 8, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 24, paddingVertical: 12 },
  backBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  merchantIcon: {
    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  merchantIconText: { fontSize: 22 },
  merchantInfo: { flex: 1, gap: 3, minWidth: 0 },
  merchantName: { fontSize: 16, fontWeight: '800', color: colors.text },
  mapLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  headline: { fontSize: 22, fontWeight: '900', color: colors.text, lineHeight: 28 },
  discountHero: {
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    ...shadow.card,
  },
  discountNumber: { color: '#FFFFFF', fontSize: 56, fontWeight: '900', lineHeight: 60 },
  discountOff: { color: 'rgba(255,255,255,0.85)', fontSize: 20, fontWeight: '700', alignSelf: 'flex-end', paddingBottom: 8 },
  description: { fontSize: 16, color: colors.text, lineHeight: 26 },
  expiryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.sm,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  expiryLabel: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  acceptButton: {
    borderRadius: radius.md, padding: 18, alignItems: 'center',
    ...shadow.card,
  },
  acceptText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  btnPressed: { opacity: 0.85 },
  dismissButton: { padding: 14, alignItems: 'center' },
  dismissText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 10, paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  modalSub: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  reasonBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: radius.sm, padding: 16,
  },
  reasonBtnPressed: { backgroundColor: colors.surfaceMuted },
  reasonText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  reasonArrow: { fontSize: 18, color: colors.textMuted },
  skipBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  skipText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
});
