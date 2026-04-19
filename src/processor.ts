import path from "path";
import type { CodefmtConfig } from "./schemas";
import { resolveDef } from "./config";
import { logger } from "./logger";
import type { RunToolFn } from "./runner";

export async function formatFiles(
  files: string[],
  formatterExtensionToToolsMap: Record<string, string[]>,
  config: CodefmtConfig,
  runTool: RunToolFn,
): Promise<void> {
  for (const filePath of files) {
    const ext = path.extname(filePath) || path.basename(filePath);
    for (const name of formatterExtensionToToolsMap[ext] ?? []) {
      const err = await runTool(
        filePath,
        name,
        resolveDef(name, "formatters", config),
        true,
      );
      if (err) logger.warn("formatter error", { name, filePath, err });
    }
  }
}

export async function lintFiles(
  files: string[],
  linterExtensionToToolsMap: Record<string, string[]>,
  config: CodefmtConfig,
  runTool: RunToolFn,
): Promise<string[]> {
  const errors: string[] = [];
  for (const filePath of files) {
    const ext = path.extname(filePath) || path.basename(filePath);
    for (const name of linterExtensionToToolsMap[ext] ?? []) {
      const err = await runTool(
        filePath,
        name,
        resolveDef(name, "linters", config),
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
