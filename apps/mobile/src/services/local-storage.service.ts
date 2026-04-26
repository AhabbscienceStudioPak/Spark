import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { generateOfferToken } from '../utils/index';

const db = SQLite.openDatabaseSync('gcw.db');

/** Initializes local SQLite tables for on-device GDPR-compliant storage. */
export async function initLocalStorage(): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dismissals (
      offer_id TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      dismissed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offer_history (
      offer_id TEXT PRIMARY KEY,
      merchant_name TEXT,
      discount_percentage REAL,
      accepted_at TEXT,
      redeemed_at TEXT,
      status TEXT
    );
  `);
}

export const localOfferStorage = {
  async getConsumerId(): Promise<string> {
    let id = await SecureStore.getItemAsync('consumer_id');
    if (!id) {
      id = generateOfferToken(); // 128-bit random ID
      await SecureStore.setItemAsync('consumer_id', id);
    }
    return id;
  },

  async getPreferences(): Promise<{
    language: 'de' | 'en';
    maxOffersPerDay: number;
    doNotDisturb: boolean;
    pushEnabled: boolean;
  }> {
    const raw = await SecureStore.getItemAsync('consumer_preferences');
    if (raw) {
      try { return JSON.parse(raw); } catch { /* fall through */ }
    }
    return { language: 'de', maxOffersPerDay: 5, doNotDisturb: false, pushEnabled: true };
  },

  async saveDismissal(offerId: string, reason: string): Promise<void> {
    await db.runAsync(
      'INSERT OR REPLACE INTO dismissals (offer_id, reason, dismissed_at) VALUES (?, ?, ?)',
      [offerId, reason, new Date().toISOString()],
    );
  },

  async saveToHistory(entry: {
    offerId: string;
    merchantName: string;
    discountPercentage: number;
    acceptedAt: string;
    status: string;
  }): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO offer_history
        (offer_id, merchant_name, discount_percentage, accepted_at, status)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.offerId, entry.merchantName, entry.discountPercentage, entry.acceptedAt, entry.status],
    );
  },
};
