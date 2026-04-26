import { ISODateString, UUID } from './common';

export interface RedemptionRecord {
  id: UUID;
  offerId: UUID;
  consumerId: UUID;
  merchantId: UUID;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  redeemedAt: ISODateString;
  cashbackCredited: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  offerId?: UUID;
  discountPercentage?: number;
  expiresAt?: ISODateString;
  errorCode?: 'INVALID_TOKEN' | 'EXPIRED' | 'ALREADY_REDEEMED' | 'NOT_FOUND';
  errorMessage?: string;
}

export interface OfferHistoryEntry {
  offerId: UUID;
  merchantName: string;
  discountPercentage: number;
  acceptedAt: ISODateString;
  redeemedAt?: ISODateString;
  status: 'accepted' | 'redeemed' | 'expired';
  savingsAmount?: number;
}
