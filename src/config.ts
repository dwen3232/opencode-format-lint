import fs from "fs";
import path from "path";
import type { CodefmtConfig, ToolDef } from "./schemas";
import { CodefmtConfigSchema } from "./schemas";
import { FORMATTER_DEFAULTS, LINTER_DEFAULTS } from "./registry/index";
import { logger } from "./logger";

const CONFIG_NAME = "codefmt.json";

export function loadConfig(directory: string): CodefmtConfig {
  const locations = [
    path.join(directory, ".opencode", CONFIG_NAME),
    path.join(process.env.HOME ?? "~", ".config", "opencode", CONFIG_NAME),
  ];
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const raw = JSON.parse(fs.readFileSync(loc, "utf8"));
        const result = CodefmtConfigSchema.safeParse(raw);
        if (!result.success) {
          logger.error(`Invalid config at ${loc}`, {
            issues: result.error.issues,
          });
          continue;
        }
        return result.data;
      } catch {
        logger.error(`Failed to parse config at ${loc}`);
      }
    }
  }
  return {};
}

export function buildExtensionToToolsMap(
  kind: "formatters" | "linters",
  config: CodefmtConfig,
  defaultExtensionToToolsMap: Record<string, string[]>,
): Record<string, string[]> {
  const extensionToToolsMap: Record<string, string[]> = {};
  for (const [toolName, exts] of Object.entries(defaultExtensionToToolsMap)) {
    for (const ext of exts) {
      if (!extensionToToolsMap[ext]) extensionToToolsMap[ext] = [];
      extensionToToolsMap[ext].push(toolName);
    }
  }
  const userByExtension =
    kind === "formatters" ? config.formatters_by_ext : config.linters_by_ext;
  if (userByExtension) {
    for (const [ext, tools] of Object.entries(userByExtension)) {
      extensionToToolsMap[ext] = tools;
    }
  }
  return extensionToToolsMap;
}

export function resolveDef(
  name: string,
  kind: "formatters" | "linters",
  config: CodefmtConfig,
): ToolDef {
  const defaults = kind === "formatters" ? FORMATTER_DEFAULTS : LINTER_DEFAULTS;
  const base: ToolDef = defaults[name] ?? {};
  const override: ToolDef =
    (kind === "formatters" ? config.formatters : config.linters)?.[name] ?? {};
  return { ...base, ...override };
}
