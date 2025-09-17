type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

const LOG_KEY = 'mcqdeck_logs';

function persist(entry: LogEntry) {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const arr: LogEntry[] = raw ? JSON.parse(raw) : [];
    arr.push(entry);
    // keep last 200 logs
    const trimmed = arr.slice(Math.max(0, arr.length - 200));
    localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = { level: 'info', message, context, timestamp: Date.now() };
    console.info('[MCQDeck]', message, context ?? '');
    persist(entry);
  },
  warn(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = { level: 'warn', message, context, timestamp: Date.now() };
    console.warn('[MCQDeck]', message, context ?? '');
    persist(entry);
  },
  error(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = { level: 'error', message, context, timestamp: Date.now() };
    console.error('[MCQDeck]', message, context ?? '');
    persist(entry);
  },
  read(): LogEntry[] {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  clear() {
    localStorage.removeItem(LOG_KEY);
  }
};


