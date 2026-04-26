import { ISODateString, SupportedLanguage, UUID } from './common';

export type NotificationChannel = 'push' | 'in_app' | 'lock_screen' | 'home_banner';

export interface ConsumerPreferences {
  preferredChannels: NotificationChannel[];
  maxOffersPerDay: number;  // 1-10
  language: SupportedLanguage;
  doNotDisturb: boolean;
}

export interface Consumer {
  id: UUID;
  anonymizedId: string;   // used in QR codes, not linked to PII
  preferences: ConsumerPreferences;
  walletBalance: number;  // simulated cashback balance
  consentGiven: boolean;
  consentGivenAt?: ISODateString;
  createdAt: ISODateString;
}

export interface IntentSignal {
  consumerId: UUID;
  intentCategory: string;  // e.g. "warm_beverages", "quick_lunch"
  strength: number;         // 0-1
  generatedAt: ISODateString;
  // NOTE: no raw location, movement, or behavioral data — GDPR compliant
}
