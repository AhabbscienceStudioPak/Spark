'use client';

import React, { useEffect, useState } from 'react';
import { api, getCurrentUser } from '../../lib/api';

const DEFAULT_MERCHANT = process.env.NEXT_PUBLIC_MERCHANT_ID ?? 'merchant-001';

interface InsightData {
  overall_decline_rate: number;
  total_offers: number;
  total_rejected: number;
  by_discount_bucket: Array<{
    bucket: string;
    total: number;
    rejected: number;
    decline_rate: number;
    common_reasons: string[];
  }>;
  insights: string[];
}

export function DeclineInsights(): JSX.Element {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState(DEFAULT_MERCHANT);

  useEffect(() => {
    const user = getCurrentUser();
    const id = user?.merchant_id ?? DEFAULT_MERCHANT;
    setMerchantId(id);
    api.get(`/analytics/merchants/${id}/decline-insights`)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading decline insights…</div>;
  if (!data) return <></>;
  if (data.total_offers === 0) return <></>;

  return (
    <section aria-label="Decline Insights" style={styles.section}>
      <h2 style={styles.heading}>Offer Decline Insights</h2>
      <p style={styles.sub}>
        {data.total_rejected} of {data.total_offers} offers declined ({data.overall_decline_rate}% decline rate)
      </p>

      {/* Insights list */}
      {data.insights.length > 0 && (
        <div style={styles.insightsList}>
          {data.insights.map((insight, i) => (
            <div key={i} style={styles.insightItem}>
              <span style={styles.insightIcon}>💡</span>
              <span style={styles.insightText}>{insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* Breakdown by discount bucket */}
      <table style={styles.table}>
        <thead>
          <tr>
            {['Discount Range', 'Total', 'Declined', 'Decline Rate', 'Common Reasons'].map((h) => (
              <th key={h} scope="col" style={styles.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.by_discount_bucket.map((row) => (
            <tr key={row.bucket} style={styles.tr}>
              <td style={styles.td}><strong>{row.bucket}</strong></td>
              <td style={styles.td}>{row.total}</td>
              <td style={styles.td}>{row.rejected}</td>
              <td style={styles.td}>
                <span style={{
                  ...styles.ratePill,
                  background: row.decline_rate > 50 ? '#FEE2E2' : '#F3F4F6',
                  color: row.decline_rate > 50 ? '#991B1B' : '#374151',
                }}>
                  {row.decline_rate}%
                </span>
              </td>
              <td style={styles.td}>
                {row.common_reasons.filter(Boolean).join(', ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24 },
  heading: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 },
  sub: { color: '#6C757D', fontSize: 14, marginBottom: 16 },
  insightsList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 },
  insightItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: '#FFFBEB', borderRadius: 10, padding: '10px 14px',
  },
  insightIcon: { fontSize: 16, flexShrink: 0 },
  insightText: { fontSize: 14, color: '#92400E' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '10px 12px', fontSize: 12,
    fontWeight: 700, color: '#6C757D', textTransform: 'uppercase',
    borderBottom: '2px solid #E9ECEF',
  },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '12px 12px', fontSize: 14, color: '#1A1A2E', verticalAlign: 'middle' },
  ratePill: { borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  loading: { padding: 24, color: '#6C757D' },
};
