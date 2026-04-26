'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginMerchant, getCurrentUser } from '../../lib/api';

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (getCurrentUser()) router.replace('/dashboard');
  }, [router]);

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginMerchant(email.trim().toLowerCase(), password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: { message?: string } | string } } })
        ?.response?.data?.detail;
      const msg = typeof detail === 'object' ? detail?.message : detail;
      setError(msg ?? 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Branding */}
        <div style={styles.hero}>
          <span style={{ fontSize: 48 }}>🏙️</span>
          <h1 style={styles.appName}>City Wallet</h1>
          <p style={styles.tagline}>Merchant Dashboard</p>
        </div>

        <form onSubmit={handleLogin} style={styles.form} aria-label="Merchant login">
          <h2 style={styles.formTitle}>Sign In</h2>

          {error && (
            <div style={styles.errorBox} role="alert">
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          <div style={styles.field}>
            <label htmlFor="email" style={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="merchant@demo.com"
              autoComplete="email"
              required
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.loginBtn, ...(loading ? styles.disabled : {}) }}
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Demo credentials */}
        <div style={styles.demoBox}>
          <p style={styles.demoTitle}>Demo Credentials</p>
          <p style={styles.demoText}>merchant@demo.com / demo1234</p>
          <p style={styles.demoText}>admin@demo.com / admin1234</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: '#F8F9FA', padding: 24,
  },
  card: {
    background: '#fff', borderRadius: 20, padding: 40,
    width: '100%', maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column', gap: 24,
  },
  hero: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  appName: { fontSize: 28, fontWeight: 800, color: '#1A1A2E', margin: 0 },
  tagline: { fontSize: 14, color: '#6C757D', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formTitle: { fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 },
  errorBox: { background: '#FFF0F0', borderRadius: 10, padding: '10px 14px' },
  errorText: { color: '#E63946', fontSize: 14, margin: 0, fontWeight: 500 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 14, fontWeight: 600, color: '#495057' },
  input: {
    padding: '12px 14px', borderRadius: 10, border: '1.5px solid #DEE2E6',
    fontSize: 15, outline: 'none', background: '#FAFAFA', color: '#1A1A2E',
  },
  loginBtn: {
    background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 12,
    padding: '14px', fontWeight: 800, fontSize: 16, cursor: 'pointer',
    marginTop: 4,
  },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  demoBox: {
    background: '#EFF6FF', borderRadius: 12, padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  demoTitle: { fontSize: 11, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', margin: 0 },
  demoText: { fontSize: 13, color: '#3B82F6', fontFamily: 'monospace', margin: 0 },
};
