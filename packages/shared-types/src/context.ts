import { Coordinates, ISODateString } from './common';

export type WeatherCondition = 'clear' | 'rain' | 'snow' | 'clouds' | 'fog' | 'storm';

export type TimeOfDay = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';

export type DayType = 'weekday' | 'weekend' | 'holiday';

export interface WeatherSignal {
  temperature: number; // Celsius, range: -50 to 60
  condition: WeatherCondition;
  precipitation: boolean;
  humidity: number;
  fetchedAt: ISODateString;
}

export interface LocationSignal {
  coordinates: Coordinates;
  accuracy: number; // meters
  city: string;
  neighborhood?: string;
  fetchedAt: ISODateString;
}

export interface TimeSignal {
  localTime: ISODateString;
  timeOfDay: TimeOfDay;
  dayType: DayType;
  dayOfWeek: number; // 0 = Sunday
  isHoliday: boolean;
}

export interface EventSignal {
  id: string;
  name: string;
  type: 'concert' | 'sports' | 'festival' | 'conference' | 'other';
  startTime: ISODateString;
  estimatedAttendance: number;
  distanceMeters: number;
  isActive: boolean; // starts within 2 hours
}

export interface TransactionDensitySignal {
  merchantId: string;
  currentDensity: number;
  typicalDensity: number;
  densityRatio: number; // current / typical
  isLowDemand: boolean; // ratio < 0.6
  updatedAt: ISODateString;
}

export interface CompositeContextState {
  id: string;
  weather: WeatherSignal;
  location: LocationSignal;
  time: TimeSignal;
  events: EventSignal[];
  transactionDensity: TransactionDensitySignal[];
  relevanceScore: number; // 0-100
  triggeredAt: ISODateString;
}
