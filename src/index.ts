import type { Plugin } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk/v2";
import { loadConfig, buildExtensionToToolsMap } from "./config";
import { runTool } from "./runner";
import { formatFiles, lintFiles, buildLintReport } from "./processor";
import {
  DEFAULT_FORMATTER_EXTENSIONS,
  DEFAULT_LINTER_EXTENSIONS,
} from "./registry/index";
import { logger } from "./logger";
import { shell } from "./shell";

export const CodefmtPlugin: Plugin = async ({ client, $, directory }) => {
  // setting singletons to move plugin constants to global scope
  logger.setBackend((level, message, extra) =>
    client.app.log({
      body: { service: "opencode-format-lint", level, message, extra },
    }),
  );
  shell.setBackend($);

  const config = loadConfig(directory);
  const formatterExtensionToToolsMap = buildExtensionToToolsMap(
    "formatters",
    config,
    DEFAULT_FORMATTER_EXTENSIONS,
  );
  const linterExtensionToToolsMap = buildExtensionToToolsMap(
    "linters",
    config,
    DEFAULT_LINTER_EXTENSIONS,
  );
  const pendingBySession = new Map<string, Set<string>>();

  const isParentSession = async (sessionID: string): Promise<boolean> => {
    try {
      const result = await client.session.get({ path: { id: sessionID } });
      return !result.data?.parentID;
    } catch {
      return true;
    }
  };

  logger.info("plugin loaded");

  return {
    "tool.execute.after": async (input) => {
      if (input.tool !== "edit" && input.tool !== "write") return;
      const filePath = (input.args as { filePath?: string })?.filePath;
      if (!filePath) return;
      if (!pendingBySession.has(input.sessionID)) {
        pendingBySession.set(input.sessionID, new Set());
      }
      pendingBySession.get(input.sessionID)!.add(filePath);
      logger.debug("tracked file", { sessionID: input.sessionID, filePath });
    },

    event: async ({ event: _event }) => {
      const event = _event as unknown as Event;
      if (event.type !== "session.idle") return;

      const { sessionID } = event.properties;

      if (!(await isParentSession(sessionID))) {
        logger.debug("session.idle suppressed (child session)", { sessionID });
        return;
      }

      const files = pendingBySession.get(sessionID);
      if (!files || files.size === 0) return;
      const fileList = [...files];
      pendingBySession.delete(sessionID);

      logger.info("running format+lint", { sessionID, count: fileList.length });

      await formatFiles(
        fileList,
        formatterExtensionToToolsMap,
        config,
        runTool,
      );

      const errors = await lintFiles(
        fileList,
        linterExtensionToToolsMap,
        config,
        runTool,
      );

      if (errors.length > 0) {
        const report = buildLintReport(errors);
        logger.info("injecting lint report", {
          sessionID,
          errorCount: errors.length,
        });
        try {
          await client.session.prompt({
            path: { id: sessionID },
            body: { parts: [{ type: "text", text: report }] },
          });
        } catch (e) {
          logger.error("failed to inject lint report", { error: String(e) });
        }
      }
    },
  };
};

export default CodefmtPlugin;
