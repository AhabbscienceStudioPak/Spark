'use client';

import React, { useState } from 'react';
import { useCampaignRules } from '../../lib/hooks';
import { CampaignRuleForm } from './CampaignRuleForm';

interface CampaignRule {
  id: string;
  name: string;
  max_discount_percentage: number;
  goal: string;
  is_active: boolean;
  target_time_windows: Array<{ start: string; end: string }>;
  target_days_of_week: number[];
}

const GOAL_LABELS: Record<string, string> = {
  increase_foot_traffic: 'Increase Foot Traffic',
  clear_inventory: 'Clear Inventory',
  boost_category: 'Boost Category',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CampaignRulesList(): JSX.Element {
  const { rules, loading, create } = useCampaignRules();
  const [showForm, setShowForm] = useState(false);

  if (loading) return <div style={styles.loading}>Loading campaign rules…</div>;

  return (
    <section aria-label="Campaign Rules" style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Campaign Rules</h2>
        <button
          type="button"
          style={styles.addBtn}
          onClick={() => setShowForm(true)}
          aria-label="Add new campaign rule"
        >
          + Add Rule
        </button>
      </div>

      {showForm && (
        <CampaignRuleForm
          onSubmit={async (rule) => { await create(rule); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {(rules as CampaignRule[]).length === 0 && !showForm ? (
        <p style={styles.empty}>
          No campaign rules yet. Add a rule to start generating offers automatically.
        </p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['Name', 'Max Discount', 'Goal', 'Time Windows', 'Days', 'Status'].map((h) => (
                <th key={h} scope="col" style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rules as CampaignRule[]).map((rule) => (
              <tr key={rule.id} style={styles.tr}>
                <td style={styles.td}><strong>{rule.name}</strong></td>
                <td style={styles.td}>
                  <span style={styles.discountPill}>{rule.max_discount_percentage}%</span>
                </td>
                <td style={styles.td}>{GOAL_LABELS[rule.goal] ?? rule.goal}</td>
                <td style={styles.td}>
                  {(() => {
                    const windows = typeof rule.target_time_windows === 'string'
                      ? JSON.parse(rule.target_time_windows || '[]')
                      : (rule.target_time_windows ?? []);
                    return windows.length > 0
                      ? windows.map((w: { start: string; end: string }) => `${w.start}–${w.end}`).join(', ')
                      : 'All day';
                  })()}
                </td>
                <td style={styles.td}>
                  {(() => {
                    const days = typeof rule.target_days_of_week === 'string'
                      ? JSON.parse(rule.target_days_of_week || '[]')
                      : (rule.target_days_of_week ?? []);
                    return days.length > 0
                      ? days.map((d: number) => DAY_LABELS[d]).join(', ')
                      : 'Every day';
                  })()}
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.statusPill, ...(rule.is_active ? styles.active : styles.inactive) }}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  addBtn: {
    background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 8,
    padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
  },
  loading: { padding: 24, color: '#6C757D' },
  empty: { color: '#6C757D' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '10px 12px', fontSize: 12,
    fontWeight: 700, color: '#6C757D', textTransform: 'uppercase',
    borderBottom: '2px solid #E9ECEF',
  },
  tr: { borderBottom: '1px solid #F0F0F0' },
  td: { padding: '12px 12px', fontSize: 14, color: '#1A1A2E', verticalAlign: 'middle' },
  discountPill: {
    background: '#FFF3CD', color: '#856404', borderRadius: 6,
    padding: '2px 8px', fontWeight: 700, fontSize: 13,
  },
  statusPill: { borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 },
  active: { background: '#D1FAE5', color: '#065F46' },
  inactive: { background: '#F3F4F6', color: '#6B7280' },
};
