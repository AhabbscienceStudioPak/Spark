import React, { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { colors, radius, spacing } from '../../theme/tokens';

interface ConsentGateProps {
  children: React.ReactNode;
}

/**
 * GDPR consent gate — blocks app usage until explicit consent is given.
 * Consent state is stored securely on-device.
 */
export function ConsentGate({ children }: ConsentGateProps): ReactElement {
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);

  useEffect(() => {
    void SecureStore.getItemAsync('gdpr_consent').then((value) => {
      setConsentGiven(value === 'true');
    });
  }, []);

  const handleAccept = async (): Promise<void> => {
    await SecureStore.setItemAsync('gdpr_consent', 'true');
    setConsentGiven(true);
  };

  if (consentGiven === null) return <View style={styles.loading} />;

  if (!consentGiven) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Privacy Matters</Text>
        <Text style={styles.body}>
          City Wallet uses your location and context to generate personalized offers.
          Your raw location and behavioral data stays on your device. Only abstract
          preference signals are sent to our servers.{'\n\n'}
          You can delete your data at any time in Settings.
        </Text>
        <Pressable style={styles.button} onPress={handleAccept} accessibilityRole="button">
          <Text style={styles.buttonText}>I Understand & Accept</Text>
        </Pressable>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: colors.bg, gap: spacing.xl },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 26 },
  button: { backgroundColor: colors.primary, borderRadius: radius.sm, padding: 18, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
