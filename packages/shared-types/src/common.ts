/** ISO 8601 date-time string */
export type ISODateString = string;

/** UUID v4 string */
export type UUID = string;

/** Latitude/longitude coordinate pair */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** Generic paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Standard API error shape */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Standard API response envelope */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: ISODateString;
}

/** Supported languages */
export type SupportedLanguage = 'de' | 'en';

/** Supported cities */
export type CityCode = string;
