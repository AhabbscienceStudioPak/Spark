import { Coordinates, ISODateString, UUID } from './common';

export type MerchantCategory =
  | 'cafe'
  | 'restaurant'
  | 'retail'
  | 'bakery'
  | 'bar'
  | 'gym'
  | 'pharmacy'
  | 'other';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface OperatingHours {
  dayOfWeek: DayOfWeek;
  openTime: string;  // HH:mm
  closeTime: string; // HH:mm
}

export interface CampaignRule {
  id: UUID;
  merchantId: UUID;
  name: string;
  maxDiscountPercentage: number;  // 0-100 invariant
  targetTimeWindows: Array<{ start: string; end: string }>; // HH:mm
  targetDaysOfWeek: DayOfWeek[];
  eligibleCategories: string[];
  goal: 'increase_foot_traffic' | 'clear_inventory' | 'boost_category';
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface Merchant {
  id: UUID;
  name: string;
  category: MerchantCategory;
  location: Coordinates;
  address: string;
  city: string;
  geoFenceRadiusMeters: number;
  operatingHours: OperatingHours[];
  campaignRules: CampaignRule[];
  offerPreviewMode: boolean;  // true = merchant approves before consumer sees
  isActive: boolean;
  onboardedAt: ISODateString;
}

export interface MerchantPerformanceMetrics {
  merchantId: UUID;
  totalOffersGenerated: number;
  acceptanceRate: number;
  redemptionRate: number;
  averageDiscountGiven: number;
  totalDiscountAmount: number;
  estimatedIncrementalRevenue: number;
  periodStart: ISODateString;
  periodEnd: ISODateString;
}
