/**
 * Req 27.2: Non-intrusive banner showing active context signals and degraded sources.
 */
import React from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CompositeContextState } from '../../types/index';
import { colors, radius, spacing } from '../../theme/tokens';

interface ContextBannerProps {
  context: CompositeContextState;
  degradedSources?: string[];
}

const WEATHER_EMOJI: Record<string, string> = {
  clear: '☀️', rain: '🌧️', snow: '❄️', clouds: '☁️', fog: '🌫️', storm: '⛈️',
};

export function ContextBanner({ context, degradedSources = [] }: ContextBannerProps): ReactElement {
  const { weather, time } = context;
  const hasDegraded = degradedSources.length > 0;
  const timeOfDay = time.timeOfDay ?? time.time_of_day;
  const dayType = time.dayType ?? time.day_type;
  const hasNearbyEvent = context.events.some((e) => e.isActive ?? e.is_active);

  return (
    <View style={[styles.banner, hasDegraded && styles.bannerDegraded]}>
      <Text style={styles.text} accessibilityRole="text">
        {WEATHER_EMOJI[weather.condition] ?? '🌡️'} {Math.round(weather.temperature)}°C
        {' · '}{timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}
        {' · '}{dayType === 'holiday' ? '🎉 Holiday' : dayType}
        {hasNearbyEvent ? ' · 🎭 Event nearby' : ''}
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
  banner: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerDegraded: { backgroundColor: colors.warningSoft, borderColor: '#F5D38A' },
  text: { fontSize: 13, color: colors.text, textAlign: 'center', fontWeight: '600' },
  degradedText: { fontSize: 11, color: colors.warningText, textAlign: 'center', marginTop: 3, fontWeight: '600' },
});
