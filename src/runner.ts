import fs from "fs";
import path from "path";

import { shell } from "./shell";
import type { ResolvedTool } from "./types";

/**
 * Walks upward from a file to find the nearest directory containing any of the
 * given marker files.
 */
export function findRoot(filePath: string, markers: string[]): string | null {
  if (markers.length === 0) return null;
  let dir = path.dirname(path.resolve(filePath));
  const root = path.parse(dir).root;
  while (true) {
    for (const marker of markers) {
      if (fs.existsSync(path.join(dir, marker))) return dir;
    }
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
}

/**
 * Executes a formatter or linter for a single file and normalizes the result
 * into either `null` or a user-facing error string.
 */
export async function executeToolDef(
  filePath: string,
  tool: ResolvedTool,
): Promise<string | null> {
  const { name, def } = tool;
  const markers = def.markers ?? [];
  const require_markers = def.require_markers ?? false;

  let cwd: string;
  const foundRoot = findRoot(filePath, markers);
  if (foundRoot) {
    cwd = foundRoot;
  } else if (require_markers) {
    return null;
  } else {
    cwd = process.cwd();
  }

  const cmd = def.cmd ?? name;
  const args = [...(def.args ?? []), filePath];

  const $ = shell.get();
  const result = await $`${cmd} ${args}`
    .cwd(cwd)
    .env(def.env)
    .quiet()
    .nothrow();

  if (tool.kind === "formatter") {
    if (result.exitCode !== 0 && result.stderr.toString().trim()) {
      return `[${name}] ${result.stderr.toString().trim()}`;
    }
    return null;
  } else {
    if (result.exitCode !== 0) {
      const output =
        result.stdout.toString().trim() || result.stderr.toString().trim();
      return output
        ? `[${name}] ${output}`
        : `[${name}] exit code ${result.exitCode}`;
    }
    return null;
  }
}
