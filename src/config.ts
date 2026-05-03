import fs from "fs";
import path from "path";

import type { LoggerLike } from "./logger";
import { FORMATTER_DEFAULTS, LINTER_DEFAULTS } from "./registry/index";
import type { CodefmtConfig, ToolDef } from "./schemas";
import { CodefmtConfigSchema } from "./schemas";
import type { ResolvedTool, RuntimeToolMappings } from "./types";

const CONFIG_NAME = "codefmt.json";

/**
 * Loads the first valid codefmt config, preferring project-local config over
 * the user-level fallback.
 */
export function createLoadConfig(logger: LoggerLike) {
  return function loadConfig(directory: string): CodefmtConfig {
    const projectConfigPath = path.join(directory, ".opencode", CONFIG_NAME);
    const userConfigPath = path.join(process.env.HOME ?? "~", ".config", "opencode", CONFIG_NAME);

    const locations = [projectConfigPath, userConfigPath];
    for (const loc of locations) {
      if (fs.existsSync(loc)) {
        try {
          const raw = JSON.parse(fs.readFileSync(loc, "utf8"));
          const result = CodefmtConfigSchema.safeParse(raw);
          if (result.success) {
            return result.data;
          }
          logger.warn(`Invalid config at ${loc}`, {
            issues: result.error.issues,
          });
        } catch {
          logger.warn(`Failed to parse config at ${loc}`);
        }
      }
    }

    // TODO: add a default config object that we write to the userConfigPath if it doesn't exist, then return it
    return {};
  };
}

/**
 * Builds the runtime execution plan for both formatter and linter execution,
 * resolving tool definitions only for explicitly configured extensions.
 */
export function buildRuntimeToolMappings(config: CodefmtConfig): RuntimeToolMappings {
  return {
    formatterToolsByExtension: resolveToolsByExtension(
      "formatter",
      config,
      config.formatters_by_ext ?? {},
    ),
    linterToolsByExtension: resolveToolsByExtension("linter", config, config.linters_by_ext ?? {}),
  };
}

function resolveToolsByExtension(
  kind: "formatter" | "linter",
  config: CodefmtConfig,
  extensionToToolNamesMap: Record<string, string[]>,
): Record<string, ResolvedTool[]> {
  const toolsByExtension: Record<string, ResolvedTool[]> = {};

  for (const [extension, toolNames] of Object.entries(extensionToToolNamesMap)) {
    toolsByExtension[extension] = toolNames.map((name) => ({
      name,
      kind,
      def: resolveToolDef(name, kind, config),
    }));
  }

  return toolsByExtension;
}

/**
 * Resolves a tool definition by merging built-in defaults with any user
 * override for the same tool name.
 */
export function resolveToolDef(
  name: string,
  kind: "formatter" | "linter",
  config: CodefmtConfig,
): ToolDef {
  const defaults = kind === "formatter" ? FORMATTER_DEFAULTS : LINTER_DEFAULTS;
  const base: ToolDef = defaults[name] ?? {};
  const override: ToolDef =
    (kind === "formatter" ? config.formatters : config.linters)?.[name] ?? {};
  return { ...base, ...override };
}
