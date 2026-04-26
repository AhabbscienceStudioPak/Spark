'use client';

/**
 * System Health Monitoring Dashboard (Req 30.4, 30.5)
 * - Live service health checks
 * - Key metrics: offers/hour, active consumers, redemption rate, latency, error rate
 * - Persistent alerts from system_alerts table (Req 30.5)
 * - Acknowledge alerts directly from the UI
 */
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../../lib/api';

interface ServiceHealth {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  sources?: Record<string, string>;
  timestamp: string;
}

interface SystemMetrics {
  offers_generated_last_hour: number;
  active_consumers: number;
  redemption_rate: number;
  avg_generation_latency_ms: number;
  error_rate_pct: number;
}

interface SystemAlert {
  id: number;
  severity: 'critical' | 'warning' | 'info';
  service: string;
  message: string;
  metric_name: string | null;
  metric_value: number | null;
  threshold: number | null;
  created_at: string;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'ok' ? '#10B981' : status === 'degraded' ? '#F59E0B' : '#EF4444';
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10,
      borderRadius: '50%', background: color, marginRight: 8, flexShrink: 0,
    }} />
  );
}

function MetricCard({ label, value, unit, alert }: {
  label: string; value: string | number; unit?: string; alert?: boolean;
}) {
  return (
    <div style={{ ...styles.metricCard, borderLeft: `4px solid ${alert ? '#EF4444' : '#10B981'}` }}>
      <p style={styles.metricLabel}>{label}</p>
      <p style={{ ...styles.metricValue, color: alert ? '#EF4444' : '#1A1A2E' }}>
        {value}{unit && <span style={styles.metricUnit}> {unit}</span>}
      </p>
      {alert && <p style={styles.alertBadge}>⚠️ Above threshold</p>}
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: SystemAlert; onAcknowledge: (id: number) => void }) {
  const bg = alert.severity === 'critical' ? '#FEF2F2' : '#FFFBEB';
  const border = alert.severity === 'critical' ? '#FECACA' : '#FDE68A';
  const textColor = alert.severity === 'critical' ? '#991B1B' : '#92400E';
  const icon = alert.severity === 'critical' ? '🚨' : '⚠️';

  return (
    <div style={{ ...styles.alertCard, background: bg, border: `1px solid ${border}` }}>
      <div style={styles.alertTop}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ ...styles.alertMessage, color: textColor }}>{alert.message}</p>
          <p style={styles.alertMeta}>
            {alert.service} · {new Date(alert.created_at).toLocaleString('de-DE')}
            {alert.metric_value !== null && alert.threshold !== null && (
              <> · Value: {alert.metric_value?.toFixed(1)} / Threshold: {alert.threshold}</>
            )}
          </p>
        </div>
        <button
          type="button"
          style={styles.ackBtn}
          onClick={() => onAcknowledge(alert.id)}
          aria-label="Acknowledge alert"
        >
          ✓ Acknowledge
        </button>
      </div>
    </div>
  );
}

export default function MonitoringPage(): JSX.Element {
  const [services, setServices] = useState<Record<string, ServiceHealth>>({});
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  // Use null until mounted to avoid SSR/client time mismatch
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      const res = await api.get('/health');
      setServices((prev) => ({ ...prev, 'API Gateway': { ...res.data, status: 'ok' } }));
    } catch {
      setServices((prev) => ({
        ...prev,
        'API Gateway': { status: 'down', service: 'api-gateway', timestamp: new Date().toISOString() },
      }));
    }
    // Context service health (includes data source breakdown)
    try {
      const res = await api.get('/context/health');
      setServices((prev) => ({ ...prev, 'Context Service': res.data }));
    } catch {
      setServices((prev) => ({
        ...prev,
        'Context Service': { status: 'down', service: 'context-service', timestamp: new Date().toISOString() },
      }));
    }
    setLastRefresh(new Date());
  }, []);

  const loadMetricsAndAlerts = useCallback(async (): Promise<void> => {
    try {
      const [metricsRes, alertsRes] = await Promise.allSettled([
        api.get('/analytics/system/metrics'),
        api.get('/analytics/system/alerts'),
      ]);
      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data.data);
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.data ?? []);
    } catch { /* non-critical */ }
  }, []);

  const acknowledgeAlert = async (alertId: number): Promise<void> => {
    await api.post(`/analytics/system/alerts/${alertId}/acknowledge`);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  useEffect(() => {
    void checkHealth();
    void loadMetricsAndAlerts();
    const interval = setInterval(() => {
      void checkHealth();
      void loadMetricsAndAlerts();
    }, 30_000);
    return () => clearInterval(interval);
  }, [checkHealth, loadMetricsAndAlerts]);

  const allOk = Object.values(services).every((s) => s.status === 'ok');
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>System Health Monitor</h1>
          <p style={styles.subtitle}>Auto-refreshes every 30 seconds</p>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.refreshTime}>
            Updated: {lastRefresh ? lastRefresh.toLocaleTimeString('de-DE') : '—'}
          </span>
          <button
            type="button"
            style={styles.refreshBtn}
            onClick={() => { void checkHealth(); void loadMetricsAndAlerts(); }}
          >
            ↻ Refresh Now
          </button>
        </div>
      </div>

      {/* Overall status bar */}
      <div style={{
        ...styles.statusBar,
        background: criticalAlerts.length > 0 ? '#FEF2F2' : allOk ? '#D1FAE5' : '#FFFBEB',
      }}>
        <StatusDot status={criticalAlerts.length > 0 ? 'down' : allOk ? 'ok' : 'degraded'} />
        <strong style={{ color: criticalAlerts.length > 0 ? '#991B1B' : allOk ? '#065F46' : '#92400E' }}>
          {criticalAlerts.length > 0
            ? `${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? 's' : ''} require attention`
            : allOk ? 'All systems operational' : 'Some services degraded'}
        </strong>
        {alerts.length > 0 && (
          <span style={styles.alertCount}>{alerts.length} unacknowledged alert{alerts.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Active alerts (Req 30.5) */}
      {alerts.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            🔔 Active Alerts
            <span style={styles.alertCountBadge}>{alerts.length}</span>
          </h2>
          <div style={styles.alertsList}>
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onAcknowledge={(id) => void acknowledgeAlert(id)} />
            ))}
          </div>
        </section>
      )}

      {/* Service health */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Service Status</h2>
        <div style={styles.serviceGrid}>
          {['API Gateway', 'Context Service', 'Offer Service', 'Checkout Service', 'Notification Service'].map((name) => {
            const health = services[name];
            return (
              <div key={name} style={styles.serviceCard}>
                <div style={styles.serviceHeader}>
                  <StatusDot status={health?.status ?? 'unknown'} />
                  <strong style={styles.serviceName}>{name}</strong>
                </div>
                <p style={{
                  ...styles.serviceStatus,
                  color: health?.status === 'ok' ? '#10B981' : health?.status === 'down' ? '#EF4444' : '#F59E0B',
                }}>
                  {health?.status ?? 'Checking…'}
                </p>
                {health?.sources && (
                  <div style={styles.sourcesGrid}>
                    {Object.entries(health.sources).map(([src, status]) => (
                      <span key={src} style={{
                        ...styles.sourceChip,
                        background: status === 'ok' ? '#D1FAE5' : '#FEE2E2',
                        color: status === 'ok' ? '#065F46' : '#991B1B',
                      }}>
                        {src}: {status}
                      </span>
                    ))}
                  </div>
                )}
                <p style={styles.serviceTime}>
                  {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString('de-DE') : '—'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Key metrics */}
      {metrics && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Key Metrics (Last Hour)</h2>
          <div style={styles.metricsGrid}>
            <MetricCard label="Offers Generated" value={metrics.offers_generated_last_hour} unit="/hr" />
            <MetricCard label="Active Consumers" value={metrics.active_consumers} />
            <MetricCard
              label="Redemption Rate"
              value={`${(metrics.redemption_rate * 100).toFixed(1)}%`}
            />
            <MetricCard
              label="Avg Generation Latency"
              value={metrics.avg_generation_latency_ms.toFixed(0)}
              unit="ms"
              alert={metrics.avg_generation_latency_ms > 3000}
            />
            <MetricCard
              label="Error Rate"
              value={`${metrics.error_rate_pct.toFixed(1)}%`}
              alert={metrics.error_rate_pct > 10}
            />
          </div>
        </section>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 800, color: '#1A1A2E', margin: 0 },
  subtitle: { fontSize: 13, color: '#6C757D', margin: '4px 0 0' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  refreshTime: { fontSize: 13, color: '#6C757D' },
  refreshBtn: {
    background: '#2D6A4F', color: '#fff', border: 'none', borderRadius: 8,
    padding: '8px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
  },
  statusBar: {
    borderRadius: 12, padding: '12px 20px', marginBottom: 24,
    display: 'flex', alignItems: 'center', gap: 12,
  },
  alertCount: {
    marginLeft: 'auto', fontSize: 13, color: '#6C757D',
    background: '#F3F4F6', borderRadius: 20, padding: '2px 10px',
  },
  section: { background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24 },
  sectionTitle: {
    fontSize: 18, fontWeight: 700, color: '#1A1A2E', marginBottom: 16,
    display: 'flex', alignItems: 'center', gap: 10,
  },
  alertCountBadge: {
    background: '#EF4444', color: '#fff', borderRadius: 12,
    padding: '2px 8px', fontSize: 13, fontWeight: 700,
  },
  alertsList: { display: 'flex', flexDirection: 'column', gap: 10 },
  alertCard: { borderRadius: 12, padding: 16 },
  alertTop: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  alertMessage: { fontSize: 14, fontWeight: 600, margin: 0 },
  alertMeta: { fontSize: 12, color: '#6C757D', margin: '4px 0 0' },
  ackBtn: {
    background: '#fff', border: '1px solid #D1D5DB', borderRadius: 8,
    padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    color: '#374151', whiteSpace: 'nowrap', flexShrink: 0,
  },
  serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  serviceCard: {
    background: '#F8F9FA', borderRadius: 12, padding: 16,
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  serviceHeader: { display: 'flex', alignItems: 'center' },
  serviceName: { fontSize: 14, color: '#1A1A2E' },
  serviceStatus: { fontSize: 13, margin: 0, textTransform: 'capitalize', fontWeight: 600 },
  serviceTime: { fontSize: 11, color: '#ADB5BD', margin: 0 },
  sourcesGrid: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  sourceChip: { fontSize: 11, borderRadius: 4, padding: '2px 6px', fontWeight: 600 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 },
  metricCard: {
    background: '#F8F9FA', borderRadius: 12, padding: 16,
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  metricLabel: { fontSize: 12, color: '#6C757D', fontWeight: 600, textTransform: 'uppercase', margin: 0 },
  metricValue: { fontSize: 28, fontWeight: 800, margin: '4px 0 0' },
  metricUnit: { fontSize: 14, fontWeight: 400 },
  alertBadge: { fontSize: 12, color: '#EF4444', margin: 0 },
};
