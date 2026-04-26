import { ISODateString, UUID, SupportedLanguage } from './common';

export type OfferStatus =
  | 'pending_approval'
  | 'active'
  | 'accepted'
  | 'redeemed'
  | 'expired'
  | 'rejected'
  | 'dismissed';

export interface OfferContent {
  headline: string;       // 10-150 chars
  description: string;    // 20-300 chars
  callToAction: string;
  language: SupportedLanguage;
}

export interface OfferVisualDesign {
  primaryColor: string;   // hex
  secondaryColor: string; // hex
  backgroundStyle: 'warm' | 'cool' | 'energetic' | 'calm' | 'festive';
  imageryKeywords: string[];
  layoutStyle: 'compact' | 'expanded' | 'banner';
}

export interface GeneratedOffer {
  id: UUID;
  merchantId: UUID;
  consumerId?: UUID;
  contextStateId: UUID;
  content: OfferContent;
  visualDesign: OfferVisualDesign;
  discountPercentage: number;   // 0-100, must not exceed merchant max
  expiresAt: ISODateString;
  status: OfferStatus;
  relevanceScore: number;       // 0-100
  walkingDistanceMeters: number;
  walkingTimeMinutes: number;
  generatedAt: ISODateString;
  generationModel: string;      // e.g. "qwen3:1.7b", "gemma2", "cloud-fallback"
}

export interface OfferToken {
  token: UUID;
  offerId: UUID;
  consumerId: UUID;
  merchantId: UUID;
  discountPercentage: number;
  expiresAt: ISODateString;
  redeemedAt?: ISODateString;
  isValid: boolean;
}

export interface DismissalReason {
  offerId: UUID;
  reason: 'not_interested_merchant' | 'not_interested_product' | 'bad_timing' | 'other';
  dismissedAt: ISODateString;
}
