/**
 * Offer store — fetches offers, resolves merchant names, handles accept/dismiss.
 */
import { create } from 'zustand';
import { GeneratedOffer, CompositeContextState } from '../types/index';
import { apiClient } from '../services/api.client';
import { localOfferStorage } from '../services/local-storage.service';

// Extend GeneratedOffer with display fields resolved client-side
export interface DisplayOffer extends GeneratedOffer {
  merchantName: string;
  merchantLat?: number;
  merchantLng?: number;
}

interface OfferState {
  offers: DisplayOffer[];
  isLoading: boolean;
  error: string | null;
  fetchOffers: (context: CompositeContextState) => Promise<void>;
  acceptOffer: (offerId: string) => Promise<void>;
  dismissOffer: (offerId: string, reason: string) => Promise<void>;
}

// In-memory merchant name cache to avoid repeated API calls
const merchantCache = new Map<string, { name: string; lat?: number; lng?: number }>();

async function resolveMerchantName(
  merchantId: string,
  contextDensity: CompositeContextState['transaction_density'] | undefined,
): Promise<{ name: string; lat?: number; lng?: number }> {
  if (merchantCache.has(merchantId)) {
    return merchantCache.get(merchantId)!;
  }

  // First try to get name from context density signals (already has walking distance)
  const densitySignal = contextDensity?.find((d) => (d.merchantId ?? d.merchant_id) === merchantId);
  if (densitySignal && 'merchantName' in densitySignal) {
    const result = {
      name: (densitySignal as { merchantName?: string }).merchantName ?? 'Nearby Merchant',
    };
    merchantCache.set(merchantId, result);
    return result;
  }

  // Fetch from API
  try {
    const res = await apiClient.get<{ data: { name: string; lat: number; lng: number } }>(
      `/merchants/${merchantId}`,
    );
    const result = {
      name: res.data.data.name,
      lat: res.data.data.lat,
      lng: res.data.data.lng,
    };
    merchantCache.set(merchantId, result);
    return result;
  } catch {
    return { name: 'Nearby Merchant' };
  }
}

export const useOfferStore = create<OfferState>((set) => ({
  offers: [],
  isLoading: false,
  error: null,

  fetchOffers: async (context) => {
    set({ isLoading: true, error: null });
    try {
      const consumerId = await localOfferStorage.getConsumerId();
      const prefs = await localOfferStorage.getPreferences();

      const response = await apiClient.post<{ data: GeneratedOffer[] }>('/offers/generate', {
        context_state: context,
        consumer_id: consumerId,
        consumer_language: prefs.language ?? 'de',
        consumer_max_per_day: prefs.maxOffersPerDay ?? 5,
      });

      const rawOffers = response.data.data ?? [];

      // Resolve merchant names in parallel
      const displayOffers: DisplayOffer[] = await Promise.all(
        rawOffers.map(async (offer) => {
          const merchant = await resolveMerchantName(
            offer.merchantId ?? offer.merchant_id,
            context.transactionDensity ?? context.transaction_density,
          );
          return {
            ...offer,
            merchantName: merchant.name,
            merchantLat: merchant.lat,
            merchantLng: merchant.lng,
          };
        }),
      );

      set({ offers: displayOffers, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  acceptOffer: async (offerId) => {
    const consumerId = await localOfferStorage.getConsumerId();
    await apiClient.post('/checkout/accept', { offer_id: offerId, consumer_id: consumerId });
    set((state) => ({
      offers: state.offers.map((o) =>
        o.id === offerId ? { ...o, status: 'accepted' as const } : o,
      ),
    }));
  },

  dismissOffer: async (offerId, reason) => {
    const consumerId = await localOfferStorage.getConsumerId();
    // Store locally first (GDPR: on-device)
    await localOfferStorage.saveDismissal(offerId, reason);
    // Send abstract signal upstream (non-blocking)
    apiClient.post('/checkout/dismiss', {
      offer_id: offerId,
      consumer_id: consumerId,
      reason,
    }).catch(() => {});
    // Remove from display within 1 second (Req 17.3)
    set((state) => ({
      offers: state.offers.filter((o) => o.id !== offerId),
    }));
  },
}));
