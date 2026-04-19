import type { PluginInput } from "@opencode-ai/plugin";

export type BunShell = PluginInput["$"];

export class ShellNotInitializedError extends Error {
  constructor() {
    super(
      "Shell not initialized — setBackend must be called before running tools",
    );
  }
}

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
