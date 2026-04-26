/**
 * Reverse geocoding via Nominatim (OSM) — free, no API key.
 * Maps GPS coordinates to a city code that matches our city YAML configs.
 */
import axios from 'axios';

interface NominatimResult {
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country_code?: string;
  };
}

// Maps common German city names to our city config codes
const CITY_NAME_MAP: Record<string, string> = {
  'stuttgart': 'stuttgart',
  'berlin': 'berlin',
  'münchen': 'munich',
  'munich': 'munich',
  'hamburg': 'hamburg',
  'frankfurt am main': 'frankfurt',
  'frankfurt': 'frankfurt',
  'köln': 'cologne',
  'cologne': 'cologne',
  'düsseldorf': 'dusseldorf',
  'leipzig': 'leipzig',
  'dresden': 'dresden',
  'hannover': 'hannover',
  'nuremberg': 'nuremberg',
  'nürnberg': 'nuremberg',
};

// Supported city codes (must match config/cities/*.yaml)
const SUPPORTED_CITIES = new Set(['stuttgart', 'berlin', 'munich', 'hamburg', 'frankfurt']);

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await axios.get<NominatimResult>(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: { lat, lon: lng, format: 'json', zoom: 10 },
        headers: { 'User-Agent': 'GenerativeCityWallet/1.0' },
        timeout: 5000,
      },
    );

    const address = response.data.address;
    const cityName = (
      address.city ?? address.town ?? address.village ?? address.county ?? ''
    ).toLowerCase().trim();

    const mapped = CITY_NAME_MAP[cityName];
    if (mapped && SUPPORTED_CITIES.has(mapped)) {
      return mapped;
    }

    // Partial match fallback
    for (const [key, code] of Object.entries(CITY_NAME_MAP)) {
      if (cityName.includes(key) && SUPPORTED_CITIES.has(code)) {
        return code;
      }
    }

    // Default to Stuttgart for German locations (DSV demo city)
    if (address.country_code === 'de') {
      return 'stuttgart';
    }

    return 'stuttgart'; // ultimate fallback
  } catch {
    return 'stuttgart'; // graceful degradation
  }
}
