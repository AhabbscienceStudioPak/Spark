import React, { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { encodeQrPayload } from '../../utils/index';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

interface QRCodeDisplayProps {
  token: string;
  offerId: string;
  merchantId: string;
  discountPercentage: number;
  expiresAt: string;
}

const QR_REFRESH_INTERVAL_MS = 30_000; // 30 seconds — anti-screenshot measure

/**
 * Refreshes the QR payload every 30 seconds to prevent screenshot-based fraud.
 * The timestamp in the payload is validated server-side.
 */
export function QRCodeDisplay({
  token,
  offerId,
  merchantId,
  discountPercentage,
  expiresAt,
}: QRCodeDisplayProps): ReactElement {
  const [qrValue, setQrValue] = useState<string>('');
  const { width } = useWindowDimensions();
  const qrSize = Math.min(200, width - 96);

  const refreshQr = (): void => {
    const payload = encodeQrPayload({
      t: token, o: offerId, m: merchantId,
      d: discountPercentage, exp: expiresAt, ts: Date.now(),
    });
    setQrValue(payload);
  };

  useEffect(() => {
    refreshQr();
    const interval = setInterval(refreshQr, QR_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <View style={styles.container}>
      {qrValue ? (
        <QRCode
          value={qrValue}
          size={qrSize}
          backgroundColor={colors.surface}
          color={colors.text}
        />
      ) : null}
      <Text style={styles.hint}>Show this code to the merchant</Text>
      <Text style={styles.refreshNote}>Refreshes every 30 seconds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  hint: { fontSize: 16, color: colors.text, fontWeight: '700' },
  refreshNote: { fontSize: 12, color: colors.textMuted },
});
