/**
 * Context store with:
 * - Req 1.5: 15-minute weather refresh while app is active
 * - Req 2.5: manual city fallback when location is denied
 * - Req 27.2: non-intrusive degraded-context notification
 */
import { create } from 'zustand';
import { CompositeContextState } from '../types/index';
import * as Location from 'expo-location';
import { apiClient } from '../services/api.client';
import { reverseGeocode } from '../services/geocoding.service';
import { createLogger } from '../utils/index';

const logger = createLogger('mobile:context-store');
const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes (Req 1.5)
const TIME_TRANSITION_CHECK_MS = 60 * 1000; // 60 seconds (Req 3.3)

// Time-of-day boundaries in hours
const TIME_BOUNDARIES = [6, 11, 14, 18, 22];

interface ManualCity {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

interface ContextState {
  contextState: CompositeContextState | null;
  isLoading: boolean;
  error: string | null;
  locationDenied: boolean;
  manualCity: ManualCity | null;
  degradedSources: string[];  // Req 27.2: which sources are unavailable
  refreshContext: () => Promise<void>;
  setManualCity: (city: ManualCity) => void;
  startAutoRefresh: () => () => void;
}

export const useContextStore = create<ContextState>((set, get) => ({
  contextState: null,
  isLoading: false,
  error: null,
  locationDenied: false,
  manualCity: null,
  degradedSources: [],

  setManualCity: (city) => {
    set({ manualCity: city, locationDenied: false });
    void get().refreshContext();
  },

  refreshContext: async () => {
    set({ isLoading: true, error: null });
    try {
      let lat: number;
      let lng: number;
      let cityCode: string;

      const manualCity = get().manualCity;

      if (manualCity) {
        lat = manualCity.lat;
        lng = manualCity.lng;
        cityCode = manualCity.code;
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          set({ locationDenied: true, isLoading: false });
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = location.coords.latitude;
        lng = location.coords.longitude;
        cityCode = await reverseGeocode(lat, lng);
      }

      const response = await apiClient.post<{ data: CompositeContextState }>('/api/v1/context/aggregate', {
        lat, lng, city_code: cityCode,
      });

      // Req 27.2: detect degraded sources from response
      const state = response.data.data;
      const degraded: string[] = [];
      if (!state.weather) degraded.push('weather');
      if (!state.events?.length) degraded.push('events');

      set({ contextState: state, isLoading: false, degradedSources: degraded });
    } catch (err) {
      logger.error('Context refresh failed', { error: String(err) });
      set({ error: String(err), isLoading: false });
    }
  },

  // Req 1.5: refresh every 15 minutes while app is active
  // Req 3.3: also check every 60s for time-of-day transitions
  startAutoRefresh: () => {
    let lastTimeOfDay = '';

    const checkTransition = (): void => {
      const hour = new Date().getHours();
      const newTimeOfDay = hour < 6 ? 'night'
        : hour < 11 ? 'morning'
        : hour < 14 ? 'lunch'
        : hour < 18 ? 'afternoon'
        : hour < 22 ? 'evening' : 'night';

      if (lastTimeOfDay && lastTimeOfDay !== newTimeOfDay) {
        // Time-of-day changed — refresh context within 60s (Req 3.3)
        void get().refreshContext();
      }
      lastTimeOfDay = newTimeOfDay;
    };

    // 60-second transition check
    const transitionInterval = setInterval(checkTransition, TIME_TRANSITION_CHECK_MS);
    // 15-minute full refresh
    const refreshInterval = setInterval(() => void get().refreshContext(), REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(transitionInterval);
      clearInterval(refreshInterval);
    };
  },
}));
