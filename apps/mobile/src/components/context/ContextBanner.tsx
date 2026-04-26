/**
 * Req 27.2: Non-intrusive banner showing active context signals and degraded sources.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CompositeContextState } from '../../types/index';

interface ContextBannerProps {
  context: CompositeContextState;
  degradedSources?: string[];
}

const WEATHER_EMOJI: Record<string, string> = {
  clear: '☀️', rain: '🌧️', snow: '❄️', clouds: '☁️', fog: '🌫️', storm: '⛈️',
};

export function ContextBanner({ context, degradedSources = [] }: ContextBannerProps): JSX.Element {
  const { weather, time } = context;
  const hasDegraded = degradedSources.length > 0;

  return (
    <View style={[styles.banner, hasDegraded && styles.bannerDegraded]}>
      <Text style={styles.text} accessibilityRole="text">
        {WEATHER_EMOJI[weather.condition] ?? '🌡️'} {Math.round(weather.temperature)}°C
        {' · '}{time.timeOfDay.charAt(0).toUpperCase() + time.timeOfDay.slice(1)}
        {' · '}{time.dayType === 'holiday' ? '🎉 Holiday' : time.dayType}
        {context.events.some((e) => e.isActive) ? ' · 🎭 Event nearby' : ''}
      </Text>
      {hasDegraded && (
        <Text style={styles.degradedText}>
          ⚠️ Reduced context: {degradedSources.join(', ')} unavailable
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#E9ECEF', paddingHorizontal: 16, paddingVertical: 8 },
  bannerDegraded: { backgroundColor: '#FFF3CD' },
  text: { fontSize: 13, color: '#495057', textAlign: 'center' },
  degradedText: { fontSize: 11, color: '#856404', textAlign: 'center', marginTop: 2 },
});
