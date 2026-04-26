'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/api';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'merchant' | 'admin';
}

/**
 * Wraps protected pages — redirects to /login if no valid session.
 * Uses useEffect to avoid SSR hydration mismatch (localStorage is client-only).
 */
export function AuthGuard({ children, requiredRole }: AuthGuardProps): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'ok' | 'redirect'>('loading');
  const router = useRouter();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.replace('/login');
      setStatus('redirect');
      return;
    }
    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      router.replace('/dashboard');
      setStatus('redirect');
      return;
    }
    setStatus('ok');
  }, [router, requiredRole]);

  if (status === 'loading') {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        alignItems: 'center', minHeight: 200,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={styles.spinner} />
          <p style={{ color: '#6C757D', marginTop: 12 }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (status === 'redirect') return <></>;

  return <>{children}</>;
}

const styles: Record<string, React.CSSProperties> = {
  spinner: {
    width: 32, height: 32, borderRadius: '50%',
    border: '3px solid #E9ECEF',
    borderTopColor: '#2D6A4F',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto',
  },
};
