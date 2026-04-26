import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { encodeQrPayload } from '../../utils/index';

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
}: QRCodeDisplayProps): JSX.Element {
  const [qrValue, setQrValue] = useState<string>('');

  const refreshQr = (): void => {
    const payload = encodeQrPayload({
      t: token,
      o: offerId,
      m: merchantId,
      d: discountPercentage,
      exp: expiresAt,
      ts: Date.now(),
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
          size={220}
          backgroundColor="#FFFFFF"
          color="#1A1A2E"
        />
      ) : null}
      <Text style={styles.hint}>Show this code to the merchant</Text>
      <Text style={styles.refreshNote}>Refreshes every 30 seconds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 12, padding: 24 },
  hint: { fontSize: 16, color: '#495057', fontWeight: '600' },
  refreshNote: { fontSize: 12, color: '#ADB5BD' },
});
