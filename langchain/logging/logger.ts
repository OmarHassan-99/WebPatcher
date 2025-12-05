export interface LogEntry {
  timestamp: string;
  level: "INFO" | "DEBUG" | "WARN" | "ERROR";
  message: string;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: "INFO" | "DEBUG" | "WARN" | "ERROR", message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      data,
    };

    this.logs.push(entry);

    // Also log to console
    const prefix = `[${entry.level}] ${entry.timestamp}`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  info(message: string, data?: unknown): void {
    this.log("INFO", message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log("DEBUG", message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log("WARN", message, data);
  }

  error(message: string, data?: unknown): void {
    this.log("ERROR", message, data);
  }

  getLogs(): LogEntry[] {
    return this.logs;
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();
