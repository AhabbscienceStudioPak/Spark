export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  service: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

/** Structured logger factory — each service creates its own named instance. */
export function createLogger(service: string) {
  const log = (level: LogLevel, message: string, data?: Record<string, unknown>): void => {
    const entry: LogEntry = {
      level,
      service,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    // In production, pipe to your observability stack (Datadog, Grafana, etc.)
    const output = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      console.error(output);
    } else {
      console.warn(output); // use warn to satisfy no-console rule for non-error levels
    }
  };

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),
  };
}
