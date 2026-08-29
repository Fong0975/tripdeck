export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogMeta = Record<string, unknown>;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  meta?: LogMeta;
}

export interface LoggerConfig {
  level: LogLevel;
  dir: string;
  filename: string;
  maxSizeBytes: number;
  /** How many rotated (historical) files to keep; 0 means unlimited. */
  maxFiles: number;
}
