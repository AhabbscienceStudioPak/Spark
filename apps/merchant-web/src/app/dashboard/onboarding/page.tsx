'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Tooltip } from '../../../components/ui/Tooltip';

const schema = z.object({
  name: z.string().min(2, 'Business name is required'),
  category: z.enum(['cafe', 'restaurant', 'retail', 'bakery', 'bar', 'gym', 'pharmacy', 'other']),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  geo_fence_radius_meters: z.number().min(50).max(2000),
  offer_preview_mode: z.boolean(),
  max_discount_percentage: z.number().min(1).max(100),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ['Business Info', 'Location', 'Campaign Setup', 'Review'];

export default function OnboardingPage(): JSX.Element {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'cafe',
      geo_fence_radius_meters: 500,
      offer_preview_mode: true,
      max_discount_percentage: 20,
      lat: 48.7758,
      lng: 9.1829,
    },
  });

  const values = watch();

  const onSubmit = async (data: FormValues): Promise<void> => {
    setIsSubmitting(true);
    try {
      await api.post('/merchants/onboard', data);
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch {
      alert('Onboarding failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={styles.centered}>
        <p style={{ fontSize: 64 }}>🎉</p>
        <h2 style={styles.successTitle}>You&apos;re all set!</h2>
        <p style={styles.successSub}>Your merchant profile is active. Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Merchant Onboarding</h1>

      {/* Step indicator */}
      <div style={styles.steps}>
        {STEPS.map((s, i) => (
          <div key={s} style={styles.stepItem}>
            <div style={{ ...styles.stepDot, ...(i <= step ? styles.stepDotActive : {}) }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ ...styles.stepLabel, ...(i === step ? styles.stepLabelActive : {}) }}>
              {s}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} style={styles.form}>
        {/* Step 0: Business Info */}
        {step === 0 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Business Information</h2>
            <Field label="Business Name" error={errors.name?.message}>
              <input {...register('name')} style={styles.input} placeholder="e.g. Café Müller" />
            </Field>
            <Field label="Category" error={errors.category?.message}>
              <select {...register('category')} style={styles.input}>
                {['cafe','restaurant','retail','bakery','bar','gym','pharmacy','other'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Address" error={errors.address?.message}>
              <input {...register('address')} style={styles.input} placeholder="Königstraße 1, Stuttgart" />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <input {...register('city')} style={styles.input} placeholder="Stuttgart" />
            </Field>
          </div>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Location & Geo-fence</h2>
            <div style={styles.row}>
              <Field label="Latitude" error={errors.lat?.message}>
                <input type="number" step="0.0001" {...register('lat', { valueAsNumber: true })} style={styles.input} />
              </Field>
              <Field label="Longitude" error={errors.lng?.message}>
                <input type="number" step="0.0001" {...register('lng', { valueAsNumber: true })} style={styles.input} />
              </Field>
            </div>
            <Field label="Geo-fence Radius (meters)" error={errors.geo_fence_radius_meters?.message}>
              <Tooltip content="Consumers within this radius will receive your offers. 500m is a 6-minute walk — ideal for most city merchants.">
                <input
                  type="range" min={50} max={2000} step={50}
                  {...register('geo_fence_radius_meters', { valueAsNumber: true })}
                />
              </Tooltip>
              <span style={styles.rangeValue}>{values.geo_fence_radius_meters}m</span>
            </Field>
            <div style={styles.mapPlaceholder}>
              📍 Map preview: {values.lat?.toFixed(4)}, {values.lng?.toFixed(4)}
              <br />
              <small style={{ color: '#6C757D' }}>Geo-fence radius: {values.geo_fence_radius_meters}m</small>
            </div>
          </div>
        )}

        {/* Step 2: Campaign Setup */}
        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Campaign Setup</h2>
            <Field label="Maximum Discount (%)" error={errors.max_discount_percentage?.message}>
              <Tooltip content="The AI will never generate an offer exceeding this discount. Start with 15-20% for best results.">
                <input
                  type="number" min={1} max={100}
                  {...register('max_discount_percentage', { valueAsNumber: true })}
                  style={styles.input}
                />
              </Tooltip>
              <small style={{ color: '#6C757D' }}>
                The AI will never exceed this discount when generating offers.
              </small>
            </Field>
            <Field label="Offer Preview Mode" error={undefined}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" {...register('offer_preview_mode')} />
                <Tooltip content="When enabled, you review and approve each AI-generated offer before it reaches customers. Recommended for new merchants.">
                  <span>Review offers before they reach customers</span>
                </Tooltip>
              </label>
              <small style={{ color: '#6C757D' }}>
                When enabled, you approve each generated offer before it&apos;s shown to consumers.
              </small>
            </Field>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Review & Confirm</h2>
            <div style={styles.reviewGrid}>
              {[
                ['Business Name', values.name],
                ['Category', values.category],
                ['Address', values.address],
                ['City', values.city],
                ['Location', `${values.lat}, ${values.lng}`],
                ['Geo-fence', `${values.geo_fence_radius_meters}m`],
                ['Max Discount', `${values.max_discount_percentage}%`],
                ['Preview Mode', values.offer_preview_mode ? 'Enabled' : 'Disabled'],
              ].map(([label, value]) => (
                <div key={label} style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>{label}</span>
                  <span style={styles.reviewValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={styles.navRow}>
          {step > 0 && (
            <button type="button" style={styles.backBtn} onClick={() => setStep((s) => s - 1)}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" style={styles.nextBtn} onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          ) : (
            <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Activating…' : '🚀 Activate Merchant'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#495057' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: 12, color: '#E63946' }}>{error}</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 640, margin: '0 auto' },
  title: { fontSize: 28, fontWeight: 800, color: '#1A1A2E', marginBottom: 24 },
  steps: { display: 'flex', gap: 8, marginBottom: 32, alignItems: 'center' },
  stepItem: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, background: '#E9ECEF',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, color: '#6C757D', flexShrink: 0,
  },
  stepDotActive: { background: '#2D6A4F', color: '#fff' },
  stepLabel: { fontSize: 13, color: '#6C757D' },
  stepLabelActive: { color: '#2D6A4F', fontWeight: 700 },
  form: { background: '#fff', borderRadius: 16, padding: 24 },
  stepContent: { minHeight: 280 },
  stepTitle: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', marginBottom: 20 },
  row: { display: 'flex', gap: 16 },
  input: {
    padding: '10px 12px', borderRadius: 8, border: '1px solid #DEE2E6',
    fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  rangeValue: { fontSize: 14, fontWeight: 700, color: '#2D6A4F', marginLeft: 8 },
  mapPlaceholder: {
    background: '#F8F9FA', borderRadius: 12, padding: 24,
    textAlign: 'center', color: '#495057', fontSize: 15, lineHeight: 1.6,
  },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  reviewGrid: { display: 'flex', flexDirection: 'column', gap: 0 },
  reviewRow: {
    display: 'flex', justifyContent: 'space-between', padding: '10px 0',
    borderBottom: '1px solid #F0F0F0',
  },
  reviewLabel: { fontSize: 14, color: '#6C757D' },
  reviewValue: { fontSize: 14, fontWeight: 600, color: '#1A1A2E' },
  navRow: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  backBtn: {
    background: '#E9ECEF', color: '#495057', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14,
  },
  nextBtn: {
    background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
  },
  submitBtn: {
    background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 24px', fontWeight: 700, cursor: 'pointer', fontSize: 15,
  },
  centered: { textAlign: 'center', padding: 64 },
  successTitle: { fontSize: 28, fontWeight: 800, color: '#2D6A4F' },
  successSub: { color: '#6C757D', fontSize: 16 },
};
