type Level = "debug" | "info" | "warn" | "error";
type LogFn = (
  level: Level,
  msg: string,
  extra?: Record<string, unknown>,
) => void;

export class Logger {
  private _log: LogFn = (level, msg) =>
    process.stderr.write(`[opencode-format-lint] ${level}: ${msg}\n`);

  setBackend(fn: LogFn): void {
    this._log = fn;
  }

  debug(msg: string, extra?: Record<string, unknown>): void {
    this._log("debug", msg, extra);
  }

  info(msg: string, extra?: Record<string, unknown>): void {
    this._log("info", msg, extra);
  }

  warn(msg: string, extra?: Record<string, unknown>): void {
    this._log("warn", msg, extra);
  }

  error(msg: string, extra?: Record<string, unknown>): void {
    this._log("error", msg, extra);
  }
}

export const logger = new Logger();
