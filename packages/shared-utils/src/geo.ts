import { Coordinates } from '@gcw/shared-types';

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Calculates the great-circle distance between two coordinates using the
 * Haversine formula. Satisfies the confluence property: order of arguments
 * does not affect the result.
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** Estimates walking time in minutes given distance in meters (avg 5 km/h). */
export function estimateWalkingMinutes(distanceMeters: number): number {
  const WALKING_SPEED_MPS = 5000 / 3600; // 5 km/h in m/s
  return Math.ceil(distanceMeters / WALKING_SPEED_MPS / 60);
}

/** Returns true if the consumer is within the merchant's geo-fence radius. */
export function isWithinGeoFence(
  consumer: Coordinates,
  merchant: Coordinates,
  radiusMeters: number,
): boolean {
  return haversineDistance(consumer, merchant) <= radiusMeters;
}
