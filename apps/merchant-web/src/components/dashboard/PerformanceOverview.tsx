'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { usePerformance } from '../../lib/hooks';
import { api, getCurrentUser } from '../../lib/api';

interface BreakdownRow {
  time_of_day?: string;
  day?: string;
  total: number;
  accepted: number;
  redeemed: number;
  avg_discount?: number;
}

interface BreakdownData {
  by_time_of_day: BreakdownRow[];
  by_day_of_week: BreakdownRow[];
  revenue_impact: {
    total_discount_given: number;
    total_redemptions: number;
    total_revenue: number;
    estimated_incremental_revenue: number;
  };
}

const DEFAULT_MERCHANT = process.env.NEXT_PUBLIC_MERCHANT_ID ?? 'merchant-001';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
      {sub && <p style={styles.statSub}>{sub}</p>}
    </div>
  );
}

export function PerformanceOverview(): JSX.Element {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [breakdown, setBreakdown] = useState<BreakdownData | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // usePerformance resolves merchant ID from logged-in user automatically
  const { data, loading, error, reload } = usePerformance();
  const perf = data as Record<string, number> | null;

  const loadBreakdown = async (): Promise<void> => {
    setBreakdownLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      // Get real merchant ID at call time (always client-side)
      const user = getCurrentUser();
      const mid = user?.merchant_id ?? DEFAULT_MERCHANT;
      const res = await api.get(`/analytics/merchants/${mid}/breakdown?${params}`);
      setBreakdown(res.data.data);
    } finally {
      setBreakdownLoading(false);
    }
  };

  if (loading) return <div style={styles.loading}>Loading performance data…</div>;
  if (error) return <div style={styles.error}>Failed to load: {error}</div>;

  return (
    <section aria-label="Performance Overview" style={styles.section}>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Performance Overview</h2>
        {/* Req 21.4: date range filter */}
        <div style={styles.dateFilter}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.dateInput}
            aria-label="Start date"
          />
          <span style={{ color: '#6C757D' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.dateInput}
            aria-label="End date"
          />
          <button
            type="button"
            style={styles.filterBtn}
            onClick={() => { void reload(); void loadBreakdown(); }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={styles.kpiRow}>
        <StatCard label="Offers Generated" value={String(perf?.total_offers_generated ?? 0)} />
        <StatCard
          label="Acceptance Rate"
          value={`${Math.round((perf?.acceptance_rate ?? 0) * 100)}%`}
        />
        <StatCard
          label="Redemption Rate"
          value={`${Math.round((perf?.redemption_rate ?? 0) * 100)}%`}
        />
        <StatCard
          label="Avg Discount"
          value={`${(perf?.average_discount_given ?? 0).toFixed(1)}%`}
          sub={`€${(perf?.total_discount_amount ?? 0).toFixed(2)} total given`}
        />
      </div>

      {/* Req 21.2: breakdown by time-of-day */}
      {breakdown ? (
        <>
          <h3 style={styles.subheading}>By Time of Day</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={breakdown.by_time_of_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="time_of_day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#4ECDC4" name="Generated" radius={[4,4,0,0]} />
              <Bar dataKey="redeemed" fill="#2D6A4F" name="Redeemed" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>

          <h3 style={styles.subheading}>By Day of Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={breakdown.by_day_of_week}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#E8A87C" name="Generated" radius={[4,4,0,0]} />
              <Bar dataKey="redeemed" fill="#C0392B" name="Redeemed" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Req 21.3: revenue impact */}
          <div style={styles.revenueBox}>
            <h3 style={{ ...styles.subheading, margin: 0 }}>Revenue Impact</h3>
            <div style={styles.kpiRow}>
              <StatCard
                label="Discount Given"
                value={`€${breakdown.revenue_impact.total_discount_given.toFixed(2)}`}
              />
              <StatCard
                label="Est. Incremental Revenue"
                value={`€${breakdown.revenue_impact.estimated_incremental_revenue.toFixed(2)}`}
                sub="30% of redemption revenue"
              />
              <StatCard
                label="Total Redemptions"
                value={String(breakdown.revenue_impact.total_redemptions)}
              />
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          style={styles.loadBreakdownBtn}
          onClick={() => void loadBreakdown()}
          disabled={breakdownLoading}
        >
          {breakdownLoading ? 'Loading…' : '📊 Load Detailed Breakdown'}
        </button>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  heading: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  subheading: { fontSize: 16, fontWeight: 600, color: '#495057', margin: '20px 0 12px' },
  dateFilter: { display: 'flex', alignItems: 'center', gap: 8 },
  dateInput: { padding: '6px 10px', borderRadius: 8, border: '1px solid #DEE2E6', fontSize: 13 },
  filterBtn: {
    background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 8,
    padding: '6px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
  },
  kpiRow: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 },
  statCard: { flex: '1 1 140px', background: '#F8F9FA', borderRadius: 12, padding: '16px 20px', minWidth: 120 },
  statLabel: { fontSize: 12, color: '#6C757D', fontWeight: 600, textTransform: 'uppercase', margin: 0 },
  statValue: { fontSize: 28, fontWeight: 800, color: '#1A1A2E', margin: '4px 0 0' },
  statSub: { fontSize: 12, color: '#6C757D', margin: '2px 0 0' },
  revenueBox: { background: '#F0FFF4', borderRadius: 12, padding: 16, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  loadBreakdownBtn: {
    background: '#F8F9FA', border: '1px solid #DEE2E6', borderRadius: 10,
    padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#495057',
    marginTop: 8,
  },
  loading: { padding: 24, color: '#6C757D' },
  error: { padding: 24, color: '#E63946' },
};
