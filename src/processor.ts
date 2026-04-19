import path from "path";
import type { CodefmtConfig } from "./schemas";
import { resolveToolDef } from "./config";
import { logger } from "./logger";
import type { RunToolFn } from "./runner";

// OPENCODE TODO: don't like RunToolFn actually, let's just use it directly
export async function formatFiles(
  files: string[],
  formatterExtensionToToolsMap: Record<string, string[]>,
  config: CodefmtConfig,
  runTool: RunToolFn,
): Promise<void> {
  // OPENCODE TODO: double forloop is suspiciuos again, maybe warranted though
  for (const filePath of files) {
    const ext = path.extname(filePath) || path.basename(filePath);
    for (const name of formatterExtensionToToolsMap[ext] ?? []) {
      const err = await runTool(
        filePath,
        name,
        // OPENCODE TODO: why are we resolving at execution time? Potentially re-resolving EVERY single time.
        resolveToolDef(name, "formatters", config),
        true,
      );
      if (err) logger.warn("formatter error", { name, filePath, err });
    }
  }
}

// OPENCODE TODO: don't like RunToolFn actually, let's just use it directly
export async function lintFiles(
  files: string[],
  linterExtensionToToolsMap: Record<string, string[]>,
  config: CodefmtConfig,
  runTool: RunToolFn,
): Promise<string[]> {
  const errors: string[] = [];
  // OPENCODE TODO: double forloop is suspiciuos again, maybe warranted though
  for (const filePath of files) {
    const ext = path.extname(filePath) || path.basename(filePath);
    for (const name of linterExtensionToToolsMap[ext] ?? []) {
      const err = await runTool(
        filePath,
        name,
        // OPENCODE TODO: why are we resolving at execution time? Potentially re-resolving EVERY single time.
        resolveToolDef(name, "linters", config),
        false,
      );
      if (err) errors.push(`**${filePath}**\n${err}`);
    }
  }
  return errors;
}

export function buildLintReport(errors: string[]): string {
  return `Lint errors found after the last edit. Fix them:\n\n${errors.join("\n\n")}`;
}
