import type { Metadata } from 'next';
import { LogoutButton } from '../components/nav/LogoutButton';

export const metadata: Metadata = {
  title: 'City Wallet — Merchant Dashboard',
  description: 'Manage your generative offers and view performance metrics',
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#F8F9FA' }}>
        <nav style={{
          background: '#1A1A2E', color: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center', height: 56, gap: 32,
        }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>🏙️ City Wallet</span>
          <a href="/dashboard" style={{ color: '#B7E4C7', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Dashboard
          </a>
          <a href="/dashboard/onboarding" style={{ color: '#ADB5BD', textDecoration: 'none', fontSize: 14 }}>
            Onboarding
          </a>
          <a href="/admin/monitoring" style={{ color: '#ADB5BD', textDecoration: 'none', fontSize: 14 }}>
            System Health
          </a>
          <div style={{ marginLeft: 'auto' }}>
            <LogoutButton />
          </div>
        </nav>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
