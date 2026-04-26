// Inlined shared types — replaces @gcw/shared-types for standalone mobile build

export type ISODateString = string;
export type UUID = string;
export type SupportedLanguage = 'de' | 'en';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type WeatherCondition = 'clear' | 'rain' | 'snow' | 'clouds' | 'fog' | 'storm';
export type TimeOfDay = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';
export type DayType = 'weekday' | 'weekend' | 'holiday';

export interface WeatherSignal {
  temperature: number;
  condition: WeatherCondition;
  precipitation: boolean;
  humidity: number;
  fetched_at: ISODateString;
}

export interface LocationSignal {
  coordinates: Coordinates;
  accuracy: number;
  city: string;
  neighborhood?: string;
  fetched_at: ISODateString;
}

export interface TimeSignal {
  local_time: ISODateString;
  time_of_day: TimeOfDay;
  timeOfDay?: TimeOfDay;
  day_type: DayType;
  dayType?: DayType;
  day_of_week: number;
  is_holiday: boolean;
}

export interface EventSignal {
  id: string;
  name: string;
  type: 'concert' | 'sports' | 'festival' | 'conference' | 'other';
  start_time: ISODateString;
  estimated_attendance: number;
  distance_meters: number;
  is_active: boolean;
  isActive?: boolean;
}

export interface TransactionDensitySignal {
  merchant_id: string;
  merchantId?: string;
  current_density: number;
  typical_density: number;
  density_ratio: number;
  is_low_demand: boolean;
  walking_distance_meters?: number;
  walking_time_minutes?: number;
  walkingTimeMinutes?: number;
  updated_at: ISODateString;
}

export interface CompositeContextState {
  id: UUID;
  weather: WeatherSignal;
  location: LocationSignal;
  time: TimeSignal;
  events: EventSignal[];
  transaction_density: TransactionDensitySignal[];
  transactionDensity?: TransactionDensitySignal[];
  relevance_score: number;
  triggered_at: ISODateString;
}

export type OfferStatus =
  | 'pending_approval' | 'active' | 'accepted' | 'redeemed'
  | 'expired' | 'rejected' | 'dismissed';

export interface OfferContent {
  headline: string;
  description: string;
  call_to_action: string;
  callToAction?: string;
  language: SupportedLanguage;
}

export interface OfferVisualDesign {
  primary_color: string;
  primaryColor?: string;
  secondary_color: string;
  background_color?: string;
  backgroundColor?: string;
  background_style: 'warm' | 'cool' | 'energetic' | 'calm' | 'festive';
  imagery_keywords: string[];
  layout_style: 'compact' | 'expanded' | 'banner';
  wcag_compliant?: boolean;
}

export interface GeneratedOffer {
  id: UUID;
  merchant_id: UUID;
  merchantId?: UUID;
  consumer_id?: string;
  context_state_id: UUID;
  content: OfferContent;
  visual_design: OfferVisualDesign;
  visualDesign?: OfferVisualDesign;
  discount_percentage: number;
  discountPercentage?: number;
  expires_at: ISODateString;
  expiresAt?: ISODateString;
  status: OfferStatus;
  relevance_score: number;
  walking_distance_meters: number;
  walking_time_minutes: number;
  walkingTimeMinutes?: number;
  generated_at: ISODateString;
  generation_model: string;
}

export type NotificationChannel = 'push' | 'in_app' | 'lock_screen' | 'home_banner';
