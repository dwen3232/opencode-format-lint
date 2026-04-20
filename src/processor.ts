import path from "path";
import type { ResolvedTool } from "./types";
import { executeToolDef } from "./runner";
import { logger } from "./logger";

export async function formatFiles(
  files: Iterable<string>,
  formatterToolsByExtension: Record<string, ResolvedTool[]>,
): Promise<void> {
  for (const filePath of files) {
    const ext = path.extname(filePath) || path.basename(filePath);
    for (const tool of formatterToolsByExtension[ext] ?? []) {
      const err = await executeToolDef(filePath, tool);
      if (err) logger.warn("formatter error", { name: tool.name, filePath, err });
    }
  }
}

export async function lintFiles(
  files: Iterable<string>,
  linterToolsByExtension: Record<string, ResolvedTool[]>,
): Promise<string[]> {
  const errors: string[] = [];
  for (const filePath of files) {
    const ext = path.extname(filePath) || path.basename(filePath);
    for (const tool of linterToolsByExtension[ext] ?? []) {
      const err = await executeToolDef(filePath, tool);
      if (err) errors.push(`**${filePath}**\n${err}`);
    }
  }
  return errors;
}

export function buildLintReport(errors: string[]): string {
  return `Lint errors found after the last edit. Fix them:\n\n${errors.join("\n\n")}`;
}
