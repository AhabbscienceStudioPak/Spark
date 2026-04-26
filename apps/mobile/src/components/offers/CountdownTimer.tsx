import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatCountdown } from '../../utils/index';

interface CountdownTimerProps {
  expiresAt: string;
  compact?: boolean;
}

export function CountdownTimer({ expiresAt, compact = false }: CountdownTimerProps): JSX.Element {
  const [secondsLeft, setSecondsLeft] = useState<number>(
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isUrgent = secondsLeft < 300; // < 5 minutes

  return (
    <Text
      style={[styles.timer, isUrgent && styles.urgent, compact && styles.compact]}
      accessibilityLabel={`Expires in ${formatCountdown(secondsLeft)}`}
    >
      {secondsLeft <= 0 ? 'Expired' : `Valid for ${formatCountdown(secondsLeft)}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  timer: { fontSize: 13, color: '#6C757D' },
  urgent: { color: '#E63946', fontWeight: '700' },
  compact: { fontSize: 12 },
});
