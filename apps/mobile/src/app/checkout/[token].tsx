/**
 * Checkout screen — Req 20.
 * Shows original price, discount amount, final price.
 * Consumer enters the basket total; discount is applied dynamically.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { QRCodeDisplay } from '../../components/checkout/QRCodeDisplay';
import { apiClient } from '../../services/api.client';
import { localOfferStorage } from '../../services/local-storage.service';

interface TokenData {
  token: string;
  offer_id: string;
  merchant_id: string;
  discount_percentage: number;
  expires_at: string;
  qr_payload: string;
}

interface RedemptionResult {
  original_price: number;
  discount_amount: number;
  final_price: number;
  cashback_credited: boolean;
}

export default function CheckoutScreen(): JSX.Element {
  const { token: offerId } = useLocalSearchParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);
  // Req 20.1: consumer enters the actual basket total
  const [basketTotal, setBasketTotal] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    void fetchToken();
  }, [offerId]);

  const fetchToken = async (): Promise<void> => {
    try {
      const consumerId = await localOfferStorage.getConsumerId();
      const response = await apiClient.post<{ data: TokenData }>('/checkout/accept', {
        offer_id: offerId,
        consumer_id: consumerId,
      });
      setTokenData(response.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate token';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (): Promise<void> => {
    if (!tokenData) return;
    const price = parseFloat(basketTotal);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid basket total.');
      return;
    }
    setIsCompleting(true);
    setError(null);
    try {
      const response = await apiClient.post<{ data: RedemptionResult }>('/checkout/complete', {
        token: tokenData.token,
        original_price: price,
      });
      const result = response.data.data;
      setRedemptionResult(result);
      await localOfferStorage.saveToHistory({
        offerId: tokenData.offer_id,
        merchantName: 'Merchant',
        discountPercentage: tokenData.discount_percentage,
        acceptedAt: new Date().toISOString(),
        status: 'redeemed',
      });
    } catch (err) {
      setError('Checkout failed. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  // Preview discount calculation as user types
  const previewPrice = parseFloat(basketTotal) || 0;
  const previewDiscount = tokenData ? (previewPrice * tokenData.discount_percentage) / 100 : 0;
  const previewFinal = previewPrice - previewDiscount;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2D6A4F" />
        <Text style={styles.loadingText}>Generating your offer code…</Text>
      </View>
    );
  }

  if (redemptionResult) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Offer Redeemed!</Text>
        <View style={styles.receiptBox}>
          <ReceiptRow label="Original price" value={`€${redemptionResult.original_price.toFixed(2)}`} />
          <ReceiptRow
            label={`Discount (${tokenData?.discount_percentage}%)`}
            value={`−€${redemptionResult.discount_amount.toFixed(2)}`}
            highlight
          />
          <View style={styles.receiptDivider} />
          <ReceiptRow label="You pay" value={`€${redemptionResult.final_price.toFixed(2)}`} bold />
          {redemptionResult.cashback_credited && (
            <Text style={styles.cashbackNote}>
              💳 €{redemptionResult.discount_amount.toFixed(2)} cashback credited to your wallet
            </Text>
          )}
        </View>
        <Pressable
          style={styles.doneBtn}
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Show this to the merchant</Text>
        <Text style={styles.subtitle}>
          {tokenData?.discount_percentage}% discount · Expires{' '}
          {tokenData ? new Date(tokenData.expires_at).toLocaleTimeString('de-DE', {
            hour: '2-digit', minute: '2-digit',
          }) : '—'}
        </Text>

        {tokenData && (
          <QRCodeDisplay
            token={tokenData.token}
            offerId={tokenData.offer_id}
            merchantId={tokenData.merchant_id}
            discountPercentage={tokenData.discount_percentage}
            expiresAt={tokenData.expires_at}
          />
        )}

        {/* Req 20.1: basket total input + live price preview */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Enter basket total (€)</Text>
          <TextInput
            style={styles.priceInput}
            value={basketTotal}
            onChangeText={setBasketTotal}
            keyboardType="decimal-pad"
            placeholder="e.g. 12.50"
            accessibilityLabel="Basket total in euros"
          />

          {previewPrice > 0 && tokenData && (
            <View style={styles.previewBox}>
              <ReceiptRow label="Basket total" value={`€${previewPrice.toFixed(2)}`} />
              <ReceiptRow
                label={`Discount (${tokenData.discount_percentage}%)`}
                value={`−€${previewDiscount.toFixed(2)}`}
                highlight
              />
              <View style={styles.receiptDivider} />
              <ReceiptRow label="You pay" value={`€${previewFinal.toFixed(2)}`} bold />
            </View>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.completeBtn, (!basketTotal || isCompleting) && styles.disabled]}
          onPress={handleComplete}
          disabled={!basketTotal || isCompleting}
          accessibilityRole="button"
        >
          <Text style={styles.completeBtnText}>
            {isCompleting ? 'Processing…' : '✓ Complete Purchase'}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReceiptRow({
  label, value, highlight, bold,
}: { label: string; value: string; highlight?: boolean; bold?: boolean }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, bold && styles.receiptBold]}>{label}</Text>
      <Text style={[styles.receiptValue, highlight && styles.receiptHighlight, bold && styles.receiptBold]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, gap: 20, alignItems: 'center', paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6C757D', textAlign: 'center' },
  priceSection: { width: '100%', gap: 12 },
  priceLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  priceInput: {
    borderWidth: 2, borderColor: '#2D6A4F', borderRadius: 12,
    padding: 16, fontSize: 24, fontWeight: '700', color: '#1A1A2E',
    textAlign: 'center',
  },
  previewBox: {
    backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, gap: 8,
  },
  receiptBox: {
    backgroundColor: '#F8F9FA', borderRadius: 16, padding: 20, gap: 10, width: '100%',
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  receiptLabel: { fontSize: 15, color: '#6C757D' },
  receiptValue: { fontSize: 15, color: '#1A1A2E', fontWeight: '600' },
  receiptHighlight: { color: '#2D6A4F', fontWeight: '700' },
  receiptBold: { fontWeight: '800', fontSize: 18, color: '#1A1A2E' },
  receiptDivider: { height: 1, backgroundColor: '#DEE2E6', marginVertical: 4 },
  cashbackNote: { fontSize: 13, color: '#2D6A4F', textAlign: 'center', marginTop: 4 },
  completeBtn: {
    width: '100%', backgroundColor: '#2D6A4F', borderRadius: 12, padding: 18, alignItems: 'center',
  },
  completeBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: '#6C757D', fontSize: 15 },
  loadingText: { color: '#6C757D', fontSize: 15, marginTop: 12 },
  errorText: { color: '#E63946', fontSize: 14, textAlign: 'center' },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#2D6A4F' },
  doneBtn: {
    backgroundColor: '#2D6A4F', borderRadius: 12, padding: 18,
    marginTop: 8, minWidth: 160, alignItems: 'center',
  },
  doneBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
