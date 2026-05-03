import path from "path";

import type { LoggerLike } from "./logger";
import type { ResolvedTool } from "./types";

type ExecuteToolDef = (
  filePath: string,
  tool: ResolvedTool,
  fallbackCwd: string,
) => Promise<string | null>;

export function createProcessor(runtime: { executeToolDef: ExecuteToolDef; logger: LoggerLike }) {
  async function formatFiles(
    files: Iterable<string>,
    formatterToolsByExtension: Record<string, ResolvedTool[]>,
    fallbackCwd: string,
  ): Promise<void> {
    for (const filePath of files) {
      const ext = path.extname(filePath) || path.basename(filePath);
      for (const tool of formatterToolsByExtension[ext] ?? []) {
        const err = await runtime.executeToolDef(filePath, tool, fallbackCwd);
        if (err) runtime.logger.warn("formatter error", { name: tool.name, filePath, err });
      }
    }
  }

  async function lintFiles(
    files: Iterable<string>,
    linterToolsByExtension: Record<string, ResolvedTool[]>,
    fallbackCwd: string,
  ): Promise<string[]> {
    const errors: string[] = [];
    for (const filePath of files) {
      const ext = path.extname(filePath) || path.basename(filePath);
      for (const tool of linterToolsByExtension[ext] ?? []) {
        const err = await runtime.executeToolDef(filePath, tool, fallbackCwd);
        if (err) errors.push(`**${filePath}**\n${err}`);
      }
    }
    return errors;
  }

  return { formatFiles, lintFiles };
}

export function buildLintReport(errors: string[]): string {
  return `Lint errors found after the last edit. Fix them:\n\n${errors.join("\n\n")}`;
}
