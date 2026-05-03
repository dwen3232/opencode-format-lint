type Level = "debug" | "info" | "warn" | "error";
type LogFn = (level: Level, msg: string, extra?: Record<string, unknown>) => void;

export interface LoggerLike {
  debug(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
}

/**
 * Logger wrapper that defaults to stderr until a plugin-specific runtime injects its
 * OpenCode logging backend.
 */
export class Logger implements LoggerLike {
  constructor(
    private readonly log: LogFn = (level, msg) =>
      process.stderr.write(`[opencode-format-lint] ${level}: ${msg}\n`),
  ) {}

  debug(msg: string, extra?: Record<string, unknown>): void {
    this.log("debug", msg, extra);
  }

  info(msg: string, extra?: Record<string, unknown>): void {
    this.log("info", msg, extra);
  }

  warn(msg: string, extra?: Record<string, unknown>): void {
    this.log("warn", msg, extra);
  }

  error(msg: string, extra?: Record<string, unknown>): void {
    this.log("error", msg, extra);
  }
}

export function createLogger(log: LogFn): Logger {
  return new Logger(log);
}
