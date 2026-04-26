'use client';

import React, { useState } from 'react';
import { usePendingOffers } from '../../lib/hooks';

interface Offer {
  id: string;
  content: { headline: string; description: string; call_to_action: string };
  discount_percentage: number;
  relevance_score: number;
  expires_at: string;
  visual_design: { primary_color: string };
}

export function OfferApprovalQueue(): JSX.Element {
  const { offers, loading, approve, reject } = usePendingOffers();
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (offerId: string): Promise<void> => {
    setProcessing(offerId);
    await approve(offerId);
    setProcessing(null);
  };

  const handleReject = async (offerId: string): Promise<void> => {
    setProcessing(offerId);
    await reject(offerId, rejectReasons[offerId] ?? '');
    setProcessing(null);
  };

  if (loading) return <div style={styles.loading}>Loading pending offers…</div>;

  return (
    <section aria-label="Offer Approval Queue" style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Pending Approval</h2>
        <span style={styles.badge}>{(offers as Offer[]).length}</span>
      </div>

      {(offers as Offer[]).length === 0 ? (
        <p style={styles.empty}>No offers awaiting approval. Offers will appear here when generated.</p>
      ) : (
        <div style={styles.list}>
          {(offers as Offer[]).map((offer) => (
            <div key={offer.id} style={styles.card}>
              <div style={{ ...styles.colorBar, background: offer.visual_design.primary_color }} />
              <div style={styles.cardBody}>
                <div style={styles.cardTop}>
                  <div>
                    <p style={styles.headline}>{offer.content.headline}</p>
                    <p style={styles.description}>{offer.content.description}</p>
                  </div>
                  <div style={styles.discountBadge}>
                    <span style={styles.discountText}>{offer.discount_percentage}%</span>
                    <span style={styles.discountOff}>OFF</span>
                  </div>
                </div>

                <div style={styles.meta}>
                  <span style={styles.metaItem}>Relevance: {offer.relevance_score}/100</span>
                  <span style={styles.metaItem}>
                    Expires: {new Date(offer.expires_at).toLocaleTimeString('de-DE', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    style={{ ...styles.btn, ...styles.approveBtn }}
                    onClick={() => void handleApprove(offer.id)}
                    disabled={processing === offer.id}
                    aria-label={`Approve: ${offer.content.headline}`}
                  >
                    {processing === offer.id ? '…' : '✓ Approve'}
                  </button>
                  <input
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={rejectReasons[offer.id] ?? ''}
                    onChange={(e) => setRejectReasons((r) => ({ ...r, [offer.id]: e.target.value }))}
                    style={styles.reasonInput}
                    aria-label="Rejection reason"
                  />
                  <button
                    type="button"
                    style={{ ...styles.btn, ...styles.rejectBtn }}
                    onClick={() => void handleReject(offer.id)}
                    disabled={processing === offer.id}
                    aria-label={`Reject: ${offer.content.headline}`}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24 },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  heading: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  badge: {
    background: '#E63946', color: '#fff', borderRadius: 12,
    padding: '2px 10px', fontSize: 13, fontWeight: 700,
  },
  loading: { padding: 24, color: '#6C757D' },
  empty: { color: '#6C757D', padding: '8px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    display: 'flex', border: '1px solid #E9ECEF', borderRadius: 12, overflow: 'hidden',
  },
  colorBar: { width: 6, flexShrink: 0 },
  cardBody: { flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headline: { fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  description: { fontSize: 13, color: '#6C757D', margin: '4px 0 0' },
  discountBadge: {
    background: '#E63946', borderRadius: 8, padding: '6px 12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0,
  },
  discountText: { color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: '1' },
  discountOff: { color: '#fff', fontSize: 11, fontWeight: 700 },
  meta: { display: 'flex', gap: 16 },
  metaItem: { fontSize: 12, color: '#6C757D' },
  actions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  btn: {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontWeight: 700, fontSize: 14,
  },
  approveBtn: { background: '#2D6A4F', color: '#fff' },
  rejectBtn: { background: '#FFF0F0', color: '#E63946' },
  reasonInput: {
    flex: 1, minWidth: 160, padding: '8px 12px', borderRadius: 8,
    border: '1px solid #DEE2E6', fontSize: 13, outline: 'none',
  },
};
