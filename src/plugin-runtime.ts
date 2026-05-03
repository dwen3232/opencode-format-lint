import type { PluginInput } from "@opencode-ai/plugin";

import { buildRuntimeToolMappings, createLoadConfig } from "./config";
import { createLogger } from "./logger";
import { createProcessor } from "./processor";
import { createExecuteToolDef } from "./runner";

type PluginRuntimeInput = Pick<PluginInput, "client" | "$" | "directory">;

/**
 * Builds the per-plugin runtime so lower-level helpers close over the injected
 * OpenCode services without relying on process-wide mutable state.
 */
export function createPluginRuntime({ client, $, directory }: PluginRuntimeInput) {
  const logger = createLogger((level, message, extra) =>
    client.app.log({
      body: { service: "opencode-format-lint", level, message, extra },
    }),
  );
  const loadConfig = createLoadConfig(logger);
  const config = loadConfig(directory);
  const executeToolDef = createExecuteToolDef($);
  const { formatFiles, lintFiles } = createProcessor({ executeToolDef, logger });
  const { formatterToolsByExtension, linterToolsByExtension } = buildRuntimeToolMappings(config);

  return {
    logger,
    formatFiles,
    lintFiles,
    formatterToolsByExtension,
    linterToolsByExtension,
  };
}
