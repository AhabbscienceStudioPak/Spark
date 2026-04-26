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
  const timeOfDay = time.timeOfDay ?? time.time_of_day ?? '';
  const dayType = time.dayType ?? time.day_type ?? 'weekday';
  const hasNearbyEvent = context.events?.some((e) => e.isActive ?? e.is_active);
  const weatherEmoji = WEATHER_EMOJI[weather?.condition ?? ''] ?? '🌡️';
  const temp = weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : '';

  const chips = [
    temp ? `${weatherEmoji} ${temp}` : null,
    timeOfDay ? timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1) : null,
    dayType === 'holiday' ? '🎉 Holiday' : null,
    hasNearbyEvent ? '🎭 Event' : null,
  ].filter(Boolean) as string[];

  return (
    <View style={[styles.banner, hasDegraded && styles.bannerDegraded]}>
      <View style={styles.chips}>
        {chips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>
      {hasDegraded && (
        <Text style={styles.degradedText}>
          ⚠️ {degradedSources.join(', ')} unavailable
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  bannerDegraded: { backgroundColor: colors.warningSoft, borderColor: '#F5D38A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  degradedText: { fontSize: 11, color: colors.warningText, fontWeight: '600' },
});
