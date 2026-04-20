import fs from "fs";
import path from "path";
import type { CodefmtConfig, ToolDef } from "./schemas";
import type { ResolvedTool, RuntimeToolMappings } from "./types";
import { CodefmtConfigSchema } from "./schemas";
import {
  DEFAULT_FORMATTER_EXTENSIONS,
  DEFAULT_LINTER_EXTENSIONS,
  FORMATTER_DEFAULTS,
  LINTER_DEFAULTS,
} from "./registry/index";
import { logger } from "./logger";

const CONFIG_NAME = "codefmt.json";

/**
 * Loads the first valid codefmt config, preferring project-local config over
 * the user-level fallback.
 */
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
  // TODO: should we just create an empty config if it doesn't exist?
  return {};
}

function invertToolToExtensionsMap(
  toolToExtensionsMap: Record<string, string[]>,
): Record<string, string[]> {
  const extensionToToolsMap: Record<string, string[]> = {};
  for (const [toolName, extensions] of Object.entries(toolToExtensionsMap)) {
    for (const extension of extensions) {
      if (!extensionToToolsMap[extension]) extensionToToolsMap[extension] = [];
      extensionToToolsMap[extension].push(toolName);
    }
  }
  return extensionToToolsMap;
}

/**
 * Builds the runtime execution plan for both formatter and linter execution,
 * applying user per-extension overrides and resolving tool definitions once.
 */
export function buildRuntimeToolMappings(
  config: CodefmtConfig,
): RuntimeToolMappings {
  const formatterToolNamesByExtension = invertToolToExtensionsMap(
    DEFAULT_FORMATTER_EXTENSIONS,
  );
  const linterToolNamesByExtension = invertToolToExtensionsMap(
    DEFAULT_LINTER_EXTENSIONS,
  );

  for (const [extension, tools] of Object.entries(
    config.formatters_by_ext ?? {},
  )) {
    formatterToolNamesByExtension[extension] = tools;
  }

  for (const [extension, tools] of Object.entries(
    config.linters_by_ext ?? {},
  )) {
    linterToolNamesByExtension[extension] = tools;
  }

  return {
    formatterToolsByExtension: resolveToolsByExtension(
      "formatters",
      config,
      formatterToolNamesByExtension,
    ),
    linterToolsByExtension: resolveToolsByExtension(
      "linters",
      config,
      linterToolNamesByExtension,
    ),
  };
}

function resolveToolsByExtension(
  kind: "formatters" | "linters",
  config: CodefmtConfig,
  extensionToToolNamesMap: Record<string, string[]>,
): Record<string, ResolvedTool[]> {
  const toolsByExtension: Record<string, ResolvedTool[]> = {};

  for (const [extension, toolNames] of Object.entries(
    extensionToToolNamesMap,
  )) {
    toolsByExtension[extension] = toolNames.map((name) => ({
      name,
      kind: kind === "formatters" ? "formatter" : "linter",
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
  kind: "formatters" | "linters",
  config: CodefmtConfig,
): ToolDef {
  const defaults = kind === "formatters" ? FORMATTER_DEFAULTS : LINTER_DEFAULTS;
  const base: ToolDef = defaults[name] ?? {};
  const override: ToolDef =
    (kind === "formatters" ? config.formatters : config.linters)?.[name] ?? {};
  return { ...base, ...override };
}
