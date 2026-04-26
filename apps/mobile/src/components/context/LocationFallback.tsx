/**
 * Req 2.5: Manual city/neighborhood selection when location permission is denied.
 */
import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList } from 'react-native';
import { colors, radius, shadow, spacing } from '../../theme/tokens';

const SUPPORTED_CITIES = [
  { code: 'stuttgart', name: 'Stuttgart', lat: 48.7758, lng: 9.1829 },
  { code: 'berlin', name: 'Berlin', lat: 52.5200, lng: 13.4050 },
  { code: 'munich', name: 'Munich', lat: 48.1351, lng: 11.5820 },
  { code: 'hamburg', name: 'Hamburg', lat: 53.5753, lng: 10.0153 },
  { code: 'frankfurt', name: 'Frankfurt', lat: 50.1109, lng: 8.6821 },
];

interface Props {
  onCitySelected: (city: { code: string; name: string; lat: number; lng: number }) => void;
}

export function LocationFallback({ onCitySelected }: Props): ReactElement {
  const [search, setSearch] = useState('');

  const filtered = SUPPORTED_CITIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your City</Text>
      <Text style={styles.subtitle}>
        Location access is needed for nearby offers. You can also select your city manually.
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search city…"
        value={search}
        onChangeText={setSearch}
        accessibilityLabel="Search for a city"
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <Pressable
            style={styles.cityItem}
            onPress={() => onCitySelected(item)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${item.name}`}
          >
            <Text style={styles.cityName}>📍 {item.name}</Text>
          </Pressable>
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cityName: { fontSize: 16, fontWeight: '700', color: colors.text },
});
