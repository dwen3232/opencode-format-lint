import type { Plugin } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk/v2";

import { createPluginRuntime } from "./plugin-runtime";
import { buildLintReport } from "./processor";

interface ApplyPatchMetadataFile {
  filePath?: string;
  movePath?: string;
  type?: string;
}

interface ToolExecuteAfterOutput {
  metadata?: {
    files?: ApplyPatchMetadataFile[];
  } | null;
}

/**
 * OpenCode plugin entrypoint. Tracks edited files during a turn, then formats
 * and lints them once when the parent session becomes idle.
 */
export const FormatLintPlugin: Plugin = async ({ client, $, directory }) => {
  const runtime = createPluginRuntime({ client, $, directory });
  const pendingBySession = new Map<string, Set<string>>();

  const getTrackedFiles = (
    tool: string,
    args: unknown,
    output: ToolExecuteAfterOutput,
  ): string[] => {
    if (tool === "edit" || tool === "write") {
      const filePath = (args as { filePath?: string })?.filePath;
      return filePath ? [filePath] : [];
    }

    if (tool !== "apply_patch") return [];

    const files = output.metadata?.files;
    if (!Array.isArray(files)) return [];

    const tracked = new Set<string>();
    for (const file of files) {
      if (file.type === "delete") continue;

      const target = file.movePath ?? file.filePath;
      if (target) tracked.add(target);
    }

    return [...tracked];
  };

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

  runtime.logger.info("plugin loaded");

  return {
    "tool.execute.after": async (input, output) => {
      // possible to mutate a file using bash, but that's too difficult to detect
      const filePaths = getTrackedFiles(input.tool, input.args, output);
      if (input.tool === "apply_patch" && filePaths.length === 0) {
        runtime.logger.warn("apply_patch metadata.files missing; skipping track", {
          sessionID: input.sessionID,
        });
      }
      if (filePaths.length === 0) return;

      // append everything to the root sessionID
      let rootSessionID: string;
      try {
        rootSessionID = await getRootSessionID(input.sessionID);
      } catch (error) {
        runtime.logger.error("failed to resolve root session while tracking file", {
          sessionID: input.sessionID,
          filePaths,
          error: String(error),
        });
        return;
      }

      addPendingFiles(rootSessionID, filePaths);

      runtime.logger.info("tracked files", {
        rootSessionID,
        sessionID: input.sessionID,
        tool: input.tool,
        filePaths,
      });
    },

    event: async ({ event: _event }) => {
      // NOTE: v1 event type is actually also safe here
      const event = _event as unknown as Event;

      // execute formatters and linters after turn is over
      if (event.type !== "session.idle") return;

      const { sessionID } = event.properties;

      const files = pendingBySession.get(sessionID);
      if (!files || files.size === 0) return;
      pendingBySession.delete(sessionID);

      runtime.logger.info("running format+lint", { sessionID, count: files.size });

      let errors: string[];
      try {
        await runtime.formatFiles(files, runtime.formatterToolsByExtension, directory);
        errors = await runtime.lintFiles(files, runtime.linterToolsByExtension, directory);
      } catch (error) {
        addPendingFiles(sessionID, files);
        runtime.logger.error("format+lint failed", {
          sessionID,
          count: files.size,
          error: String(error),
        });
        return;
      }

      if (errors.length > 0) {
        const report = buildLintReport(errors);
        runtime.logger.info("injecting lint report", {
          sessionID,
          errorCount: errors.length,
        });
        try {
          await client.session.prompt({
            path: { id: sessionID },
            body: { parts: [{ type: "text", text: report }] },
          });
        } catch (e) {
          runtime.logger.error("failed to inject lint report", { error: String(e) });
        }
      }
    },
  };
};

export default FormatLintPlugin;
