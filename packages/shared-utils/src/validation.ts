/**
 * Validates that a discount percentage satisfies the invariant: 0 <= value <= 100.
 */
export function isValidDiscount(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

/**
 * Validates that a temperature value satisfies the invariant: -50 <= value <= 60.
 */
export function isValidTemperature(value: number): boolean {
  return Number.isFinite(value) && value >= -50 && value <= 60;
}

/**
 * Validates that a relevance score satisfies the invariant: 0 <= value <= 100.
 */
export function isValidRelevanceScore(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

/** Validates headline length: 10-150 characters. */
export function isValidHeadline(text: string): boolean {
  return text.length >= 10 && text.length <= 150;
}

/** Validates description length: 20-300 characters. */
export function isValidDescription(text: string): boolean {
  return text.length >= 20 && text.length <= 300;
}
