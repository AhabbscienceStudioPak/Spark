'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  max_discount_percentage: z.number().min(1).max(100),
  goal: z.enum(['increase_foot_traffic', 'clear_inventory', 'boost_category']),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSubmit: (rule: object) => Promise<void>;
  onCancel: () => void;
}

export function CampaignRuleForm({ onSubmit, onCancel }: Props): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      goal: 'increase_foot_traffic',
      max_discount_percentage: 15,
      start_time: '10:00',
      end_time: '14:00',
    },
  });

  const submit = async (values: FormValues): Promise<void> => {
    await onSubmit({
      name: values.name,
      max_discount_percentage: values.max_discount_percentage,
      goal: values.goal,
      target_time_windows: [{ start: values.start_time, end: values.end_time }],
      target_days_of_week: [1, 2, 3, 4, 5], // weekdays by default
      eligible_categories: [],
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} style={styles.form} aria-label="New Campaign Rule">
      <h3 style={styles.formTitle}>New Campaign Rule</h3>

      <div style={styles.field}>
        <label htmlFor="name" style={styles.label}>Rule Name</label>
        <input id="name" {...register('name')} style={styles.input} placeholder="e.g. Quiet Afternoon Boost" />
        {errors.name && <span style={styles.error}>{errors.name.message}</span>}
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label htmlFor="max_discount" style={styles.label}>Max Discount (%)</label>
          <input
            id="max_discount"
            type="number"
            min={1} max={100}
            {...register('max_discount_percentage', { valueAsNumber: true })}
            style={styles.input}
          />
          {errors.max_discount_percentage && (
            <span style={styles.error}>{errors.max_discount_percentage.message}</span>
          )}
        </div>

        <div style={styles.field}>
          <label htmlFor="goal" style={styles.label}>Goal</label>
          <select id="goal" {...register('goal')} style={styles.input}>
            <option value="increase_foot_traffic">Increase Foot Traffic</option>
            <option value="clear_inventory">Clear Inventory</option>
            <option value="boost_category">Boost Category</option>
          </select>
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.field}>
          <label htmlFor="start_time" style={styles.label}>Start Time</label>
          <input id="start_time" type="time" {...register('start_time')} style={styles.input} />
          {errors.start_time && <span style={styles.error}>{errors.start_time.message}</span>}
        </div>
        <div style={styles.field}>
          <label htmlFor="end_time" style={styles.label}>End Time</label>
          <input id="end_time" type="time" {...register('end_time')} style={styles.input} />
          {errors.end_time && <span style={styles.error}>{errors.end_time.message}</span>}
        </div>
      </div>

      <div style={styles.actions}>
        <button type="submit" style={styles.submitBtn} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save Rule'}
        </button>
        <button type="button" style={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    background: '#F8F9FA', borderRadius: 12, padding: 20,
    marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14,
  },
  formTitle: { fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  row: { display: 'flex', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  label: { fontSize: 13, fontWeight: 600, color: '#495057' },
  input: {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #DEE2E6',
    fontSize: 14, outline: 'none', background: '#fff',
  },
  error: { fontSize: 12, color: '#E63946' },
  actions: { display: 'flex', gap: 10 },
  submitBtn: {
    background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
  },
  cancelBtn: {
    background: '#E9ECEF', color: '#495057', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14,
  },
};
