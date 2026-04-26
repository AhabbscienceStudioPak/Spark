import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure offer token with minimum 128-bit entropy.
 * Round-trip property: encode(decode(token)) === token.
 */
export function generateOfferToken(): string {
  return randomBytes(16).toString('hex'); // 128-bit = 32 hex chars
}

/** Encodes an offer token payload into a QR-safe string. */
export function encodeQrPayload(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/** Decodes a QR payload string back to the original object. */
export function decodeQrPayload<T = Record<string, unknown>>(encoded: string): T {
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as T;
}
