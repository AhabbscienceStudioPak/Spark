// Inlined shared utils — replaces @gcw/shared-utils for standalone mobile build

import * as Crypto from 'expo-crypto';

// ── Geo ───────────────────────────────────────────────────────────────────────
const EARTH_RADIUS_METERS = 6_371_000;
const WALKING_SPEED_MPS = 5000 / 3600;

export interface LatLng { lat: number; lng: number; }

export function haversineDistance(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function estimateWalkingMinutes(distanceMeters: number): number {
  return Math.ceil(distanceMeters / WALKING_SPEED_MPS / 60);
}

// ── Time ──────────────────────────────────────────────────────────────────────
export function getTimeOfDay(hour: number): string {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

export function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'Expired';
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

// ── Token ─────────────────────────────────────────────────────────────────────
export function generateOfferToken(): string {
  // Use expo-crypto for secure random bytes
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function encodeQrPayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function decodeQrPayload<T = Record<string, unknown>>(encoded: string): T {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const json = atob(padded);
  return JSON.parse(json) as T;
}

// ── Logger ────────────────────────────────────────────────────────────────────
export function createLogger(service: string) {
  return {
    debug: (msg: string, data?: object) => console.log(`[${service}] ${msg}`, data ?? ''),
    info: (msg: string, data?: object) => console.log(`[${service}] ${msg}`, data ?? ''),
    warn: (msg: string, data?: object) => console.warn(`[${service}] ${msg}`, data ?? ''),
    error: (msg: string, data?: object) => console.error(`[${service}] ${msg}`, data ?? ''),
  };
}
