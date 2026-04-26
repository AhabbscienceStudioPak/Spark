/**
 * Req 2.5: Manual city/neighborhood selection when location permission is denied.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList } from 'react-native';

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

export function LocationFallback({ onCitySelected }: Props): JSX.Element {
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
  container: { padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#6C757D', lineHeight: 22 },
  searchInput: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    fontSize: 15, borderWidth: 1, borderColor: '#DEE2E6',
  },
  cityItem: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cityName: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
});
