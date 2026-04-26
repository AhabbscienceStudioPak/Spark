import { TimeOfDay, DayType } from '@gcw/shared-types';

/** Maps an hour (0-23) to a named time-of-day category. */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

/** Returns whether a given Date falls on a weekend. */
export function getDayType(date: Date, isHoliday: boolean): DayType {
  if (isHoliday) return 'holiday';
  const day = date.getDay();
  return day === 0 || day === 6 ? 'weekend' : 'weekday';
}

/** Returns true if two dates are within the same 15-minute window. */
export function isWithinRefreshWindow(
  lastFetch: Date,
  now: Date,
  windowMinutes: number,
): boolean {
  const diffMs = now.getTime() - lastFetch.getTime();
  return diffMs < windowMinutes * 60 * 1000;
}

/** Formats a countdown in seconds to a human-readable string. */
export function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return 'Expired';
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
