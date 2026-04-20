import type { PluginInput } from "@opencode-ai/plugin";

export type BunShell = PluginInput["$"];

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
    if (!this._shell)
      throw new Error(
        "Shell not initialized; setBackend must be called before running executables",
      );
    return this._shell;
  }
}

export const shell = new Shell();
