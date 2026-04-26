'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPerformance, getCampaignRules, getPendingOffers,
  approveOffer, rejectOffer, createCampaignRule, toggleCampaignRule,
  getCurrentUser,
} from './api';

/** Returns true only if the string looks like a UUID (36 chars with hyphens). */
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Resolves the merchant ID from the logged-in user. Returns null until mounted. */
function useMerchantId(override?: string): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    // This runs only on the client, after mount
    if (override && isValidUUID(override)) {
      setId(override);
      return;
    }
    const user = getCurrentUser();
    if (user?.merchant_id && isValidUUID(user.merchant_id)) {
      setId(user.merchant_id);
    }
  }, [override]);

  return id;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function usePerformance(merchantId?: string) {
  const id = useMerchantId(merchantId);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return; // wait until ID is resolved
    setLoading(true);
    try {
      const result = await getPerformance(id);
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

export function useCampaignRules(merchantId?: string) {
  const id = useMerchantId(merchantId);
  const [rules, setRules] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await getCampaignRules(id);
      const parsed = (result ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        target_time_windows: typeof r.target_time_windows === 'string'
          ? JSON.parse(r.target_time_windows as string || '[]')
          : (r.target_time_windows ?? []),
        target_days_of_week: typeof r.target_days_of_week === 'string'
          ? JSON.parse(r.target_days_of_week as string || '[]')
          : (r.target_days_of_week ?? []),
        eligible_categories: typeof r.eligible_categories === 'string'
          ? JSON.parse(r.eligible_categories as string || '[]')
          : (r.eligible_categories ?? []),
      }));
      setRules(parsed);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const create = useCallback(async (rule: object) => {
    if (!id) return;
    await createCampaignRule(id, rule);
    await load();
  }, [id, load]);

  const toggle = useCallback(async (ruleId: string, isActive: boolean) => {
    if (!id) return;
    await toggleCampaignRule(id, ruleId, isActive);
    await load();
  }, [id, load]);

  useEffect(() => { void load(); }, [load]);
  return { rules, loading, reload: load, create, toggle };
}

export function usePendingOffers(merchantId?: string) {
  const id = useMerchantId(merchantId);
  const [offers, setOffers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await getPendingOffers(id);
      const parsed = (result ?? []).map((o: Record<string, unknown>) => ({
        ...o,
        content: typeof o.content === 'string' ? JSON.parse(o.content as string) : o.content,
        visual_design: typeof o.visual_design === 'string'
          ? JSON.parse(o.visual_design as string)
          : o.visual_design,
      }));
      setOffers(parsed);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const approve = useCallback(async (offerId: string) => {
    await approveOffer(offerId);
    await load();
  }, [load]);

  const reject = useCallback(async (offerId: string, reason: string) => {
    await rejectOffer(offerId, reason);
    await load();
  }, [load]);

  useEffect(() => { void load(); }, [load]);
  return { offers, loading, reload: load, approve, reject };
}
