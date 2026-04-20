import type { Plugin } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk/v2";

import { buildRuntimeToolMappings, loadConfig } from "./config";
import { logger } from "./logger";
import { buildLintReport, formatFiles, lintFiles } from "./processor";
import { shell } from "./shell";

/**
 * OpenCode plugin entrypoint. Tracks edited files during a turn, then formats
 * and lints them once when the parent session becomes idle.
 */
export const FormatLintPlugin: Plugin = async ({ client, $, directory }) => {
  // setting singletons to move plugin constants to global scope
  logger.setBackend((level, message, extra) =>
    client.app.log({
      body: { service: "opencode-format-lint", level, message, extra },
    }),
  );
  shell.setBackend($);

  const config = loadConfig(directory);
  const { formatterToolsByExtension, linterToolsByExtension } =
    buildRuntimeToolMappings(config);
  const pendingBySession = new Map<string, Set<string>>();

  const getRootSessionID = async (sessionID: string): Promise<string> => {
    let currentID = sessionID;

    while (true) {
      const result = await client.session.get({ path: { id: currentID } });
      const session = result.data;

      if (!session?.id) {
        throw new Error(`session lookup failed for ${currentID}`);
      }

      if (!session.parentID) {
        return session.id;
      }

      currentID = session.parentID;
    }
  };

  const addPendingFiles = (sessionID: string, files: Iterable<string>): void => {
    let pending = pendingBySession.get(sessionID);
    if (!pending) {
      pending = new Set();
      pendingBySession.set(sessionID, pending);
    }

    for (const file of files) {
      pending.add(file);
    }
  };

  logger.info("plugin loaded");

  return {
    "tool.execute.after": async (input) => {
      // possible to mutate a file using bash, but that's too difficult to detect
      if (input.tool !== "edit" && input.tool !== "write") return;

      // guaranteed to have `filePath` if it's an edit or write tool
      const filePath = (input.args as { filePath?: string })?.filePath;
      if (!filePath) return;

      // append everything to the root sessionID
      let rootSessionID: string;
      try {
        rootSessionID = await getRootSessionID(input.sessionID);
      } catch (error) {
        logger.error("failed to resolve root session while tracking file", {
          sessionID: input.sessionID,
          filePath,
          error: String(error),
        });
        return;
      }

      addPendingFiles(rootSessionID, [filePath]);

      logger.debug("tracked file", {
        rootSessionID,
        sessionID: input.sessionID,
        filePath,
      });
    },

    event: async ({ event: _event }) => {
      // NOTE: v1 event type is actually also safe here
      const event = _event as unknown as Event;

      // execute formatters and linters after turn is over
      if (event.type !== "session.idle") return;

      const { sessionID } = event.properties;

      let rootSessionID: string;
      try {
        rootSessionID = await getRootSessionID(sessionID);
      } catch (error) {
        logger.error("failed to resolve root session for idle event", {
          sessionID,
          error: String(error),
        });
        return;
      }

      if (rootSessionID !== sessionID) {
        logger.debug("session.idle suppressed (child session)", {
          rootSessionID,
          sessionID,
        });
        return;
      }

      const files = pendingBySession.get(sessionID);
      if (!files || files.size === 0) return;
      pendingBySession.delete(sessionID);

      logger.info("running format+lint", { sessionID, count: files.size });

      let errors: string[];
      try {
        await formatFiles(files, formatterToolsByExtension);
        errors = await lintFiles(files, linterToolsByExtension);
      } catch (error) {
        addPendingFiles(sessionID, files);
        logger.error("format+lint failed", {
          sessionID,
          count: files.size,
          error: String(error),
        });
        return;
      }

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

export default FormatLintPlugin;
