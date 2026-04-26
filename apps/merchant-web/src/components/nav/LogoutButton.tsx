'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logoutMerchant, getCurrentUser, type AuthUser } from '../../lib/api';

export function LogoutButton(): JSX.Element | null {
  const router = useRouter();
  // Only read localStorage after mount — prevents SSR hydration mismatch
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
  }, []);

  // Render nothing on server and before mount to match SSR output
  if (!mounted || !user) return null;

  const handleLogout = (): void => {
    logoutMerchant();
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#ADB5BD' }}>
        {user.display_name}
        {' · '}
        <span style={{ color: '#B7E4C7' }}>{user.role}</span>
      </span>
      <button
        type="button"
        onClick={handleLogout}
        style={styles.btn}
        aria-label="Sign out"
      >
        Sign Out
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  btn: {
    background: 'transparent',
    border: '1px solid #495057',
    color: '#ADB5BD',
    borderRadius: 8,
    padding: '5px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
};
