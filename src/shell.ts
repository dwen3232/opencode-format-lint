import type { PluginInput } from "@opencode-ai/plugin";

export type BunShell = PluginInput["$"];

/**
 * Raised when tool execution is attempted before the Bun shell backend has
 * been injected by the plugin entrypoint.
 */
export class ShellNotInitializedError extends Error {
  constructor() {
    super(
      "Shell not initialized — setBackend must be called before running tools",
    );
  }
}

/**
 * Global shell singleton that stores OpenCode's injected Bun shell instance so
 * lower-level modules can execute commands without threading `$` everywhere.
 */
export class Shell {
  private _shell: BunShell | null = null;

  setBackend(shell: BunShell): void {
    this._shell = shell;
  }

  get(): BunShell {
    if (!this._shell) throw new ShellNotInitializedError();
    return this._shell;
  }
}

export const shell = new Shell();
