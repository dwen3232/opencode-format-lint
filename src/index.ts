/**
 * opencode-format-lint — auto-format and lint files after each agent turn.
 *
 * Flow:
 *   tool.execute.after (edit/write) → track filePath + sessionID in pendingFiles
 *   session.idle (parent sessions only) → format all pending files, lint, report errors
 */
import type { Plugin } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk/v2";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolDef {
  cmd?: string;
  args?: string[];
  markers?: string[];
  require_markers?: boolean;
  env?: Record<string, string>;
}

interface CodefmtConfig {
  formatters_by_ext?: Record<string, string[]>;
  linters_by_ext?: Record<string, string[]>;
  disabled?: string[];
  formatters?: Record<string, ToolDef>;
  linters?: Record<string, ToolDef>;
}

// ---------------------------------------------------------------------------
// Built-in registry
// ---------------------------------------------------------------------------

const DEFAULT_FORMATTER_EXT: Record<string, string[]> = {
  prettier: [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".css",
    ".html",
    ".json",
    ".md",
    ".yaml",
    ".yml",
  ],
  biome: [".js", ".ts", ".jsx", ".tsx", ".json"],
  black: [".py"],
  isort: [".py"],
  gofmt: [".go"],
  rustfmt: [".rs"],
  stylua: [".lua"],
  shfmt: [".sh"],
};

const DEFAULT_LINTER_EXT: Record<string, string[]> = {
  eslint: [".js", ".ts", ".jsx", ".tsx"],
  biome: [".js", ".ts", ".jsx", ".tsx", ".json"],
  ruff: [".py"],
  "golangci-lint": [".go"],
  shellcheck: [".sh"],
  hadolint: ["Dockerfile"],
  markdownlint: [".md"],
};

const FORMATTER_DEFAULTS: Record<string, ToolDef> = {
  prettier: {
    args: ["--write"],
    markers: [
      ".prettierrc",
      ".prettierrc.json",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.mjs",
      ".prettierrc.yaml",
      ".prettierrc.yml",
      "prettier.config.js",
      "prettier.config.cjs",
      "prettier.config.mjs",
      "prettier.config.ts",
    ],
    require_markers: false,
  },
  biome: {
    args: ["format", "--write"],
    markers: ["biome.json", "biome.jsonc"],
    require_markers: true,
  },
  black: {
    args: [],
    markers: ["pyproject.toml", "setup.cfg", ".black"],
    require_markers: false,
  },
  isort: {
    args: [],
    markers: ["pyproject.toml", "setup.cfg", ".isort.cfg"],
    require_markers: false,
  },
  gofmt: { args: ["-w"], markers: ["go.mod"], require_markers: false },
  rustfmt: { args: [], markers: ["Cargo.toml"], require_markers: false },
  stylua: {
    args: [],
    markers: [".stylua.toml", "stylua.toml"],
    require_markers: false,
  },
  shfmt: { args: ["-w"], markers: [], require_markers: false },
};

const LINTER_DEFAULTS: Record<string, ToolDef> = {
  eslint: {
    args: ["--format", "json"],
    markers: [
      ".eslintrc",
      ".eslintrc.json",
      ".eslintrc.js",
      ".eslintrc.cjs",
      "eslint.config.js",
      "eslint.config.ts",
    ],
    require_markers: true,
  },
  biome: {
    args: ["check"],
    markers: ["biome.json", "biome.jsonc"],
    require_markers: true,
  },
  ruff: {
    args: ["check", "--output-format", "json"],
    markers: ["pyproject.toml", "ruff.toml", ".ruff.toml"],
    require_markers: false,
  },
  "golangci-lint": {
    args: ["run", "--out-format", "json"],
    markers: ["go.mod", ".golangci.yml", ".golangci.yaml"],
    require_markers: false,
  },
  shellcheck: {
    args: ["--format", "json"],
    markers: [],
    require_markers: false,
  },
  hadolint: { args: ["-f", "json"], markers: [], require_markers: false },
  markdownlint: {
    args: [],
    markers: [".markdownlint.json", ".markdownlint.yaml", ".markdownlintrc"],
    require_markers: false,
  },
};

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

function loadConfig(directory: string): CodefmtConfig {
  const locations = [
    path.join(directory, ".opencode", "codefmt.json"),
    path.join(process.env.HOME ?? "~", ".config", "opencode", "codefmt.json"),
  ];
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        return JSON.parse(fs.readFileSync(loc, "utf8")) as CodefmtConfig;
      } catch {
        process.stderr.write(`[codefmt] Failed to parse config at ${loc}\n`);
      }
    }
  }
  return {};
}

// ---------------------------------------------------------------------------
// Root detection
// ---------------------------------------------------------------------------

function findRoot(filePath: string, markers: string[]): string | null {
  if (markers.length === 0) return null;
  let dir = path.dirname(path.resolve(filePath));
  const root = path.parse(dir).root;
  while (true) {
    for (const marker of markers) {
      if (fs.existsSync(path.join(dir, marker))) return dir;
    }
    if (dir === root) return null;
    dir = path.dirname(dir);
  }
}

// ---------------------------------------------------------------------------
// Shell runner
// ---------------------------------------------------------------------------

function run(
  cmd: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...(env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    proc.on("error", () =>
      resolve({ stdout: "", stderr: `command not found: ${cmd}`, code: 127 }),
    );
  });
}

// ---------------------------------------------------------------------------
// Tool runner
// ---------------------------------------------------------------------------

async function runTool(
  filePath: string,
  name: string,
  def: ToolDef,
  isFormatter: boolean,
): Promise<string | null> {
  const markers = def.markers ?? [];
  const require_markers = def.require_markers ?? false;

  let cwd: string;
  const foundRoot = findRoot(filePath, markers);
  if (foundRoot) {
    cwd = foundRoot;
  } else if (require_markers) {
    return null;
  } else {
    cwd = process.cwd();
  }

  const cmd = def.cmd ?? name;
  const extraArgs = def.args ?? [];
  const args = [...extraArgs, filePath];

  const result = await run(cmd, args, cwd, def.env);

  if (isFormatter) {
    if (result.code !== 0 && result.stderr.trim()) {
      return `[${name}] ${result.stderr.trim()}`;
    }
    return null;
  } else {
    if (result.code !== 0) {
      const output = result.stdout.trim() || result.stderr.trim();
      return output
        ? `[${name}] ${output}`
        : `[${name}] exit code ${result.code}`;
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Ext → tool mapping helpers
// ---------------------------------------------------------------------------

function buildExtMap(
  kind: "formatters" | "linters",
  config: CodefmtConfig,
  defaultExtMap: Record<string, string[]>,
): Record<string, string[]> {
  const extMap: Record<string, string[]> = {};
  for (const [toolName, exts] of Object.entries(defaultExtMap)) {
    for (const ext of exts) {
      if (!extMap[ext]) extMap[ext] = [];
      extMap[ext].push(toolName);
    }
  }
  const userByExt =
    kind === "formatters" ? config.formatters_by_ext : config.linters_by_ext;
  if (userByExt) {
    for (const [ext, tools] of Object.entries(userByExt)) {
      extMap[ext] = tools;
    }
  }
  return extMap;
}

function resolveDef(
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

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const CodefmtPlugin: Plugin = async ({ client, directory }) => {
  const config = loadConfig(directory);
  const disabled = new Set(config.disabled ?? []);

  const formatterExtMap = buildExtMap(
    "formatters",
    config,
    DEFAULT_FORMATTER_EXT,
  );
  const linterExtMap = buildExtMap("linters", config, DEFAULT_LINTER_EXT);

  const pendingBySession = new Map<string, Set<string>>();

  const log = (
    level: "debug" | "info" | "warn" | "error",
    msg: string,
    extra?: Record<string, unknown>,
  ) =>
    client.app.log({
      body: { service: "opencode-format-lint", level, message: msg, extra },
    });

  log("info", "plugin loaded");

  const isParentSession = async (sessionID: string): Promise<boolean> => {
    try {
      const result = await client.session.get({ path: { id: sessionID } });
      return !result.data?.parentID;
    } catch {
      return true;
    }
  };

  return {
    "tool.execute.after": async (input) => {
      if (input.tool !== "edit" && input.tool !== "write") return;
      const filePath = (input.args as { filePath?: string })?.filePath;
      if (!filePath) return;
      if (!pendingBySession.has(input.sessionID)) {
        pendingBySession.set(input.sessionID, new Set());
      }
      pendingBySession.get(input.sessionID)!.add(filePath);
      log("debug", "tracked file", { sessionID: input.sessionID, filePath });
    },

    event: async ({ event: _event }) => {
      const event = _event as unknown as Event;
      if (event.type !== "session.idle") return;

      const { sessionID } = event.properties;

      if (!(await isParentSession(sessionID))) {
        log("debug", "session.idle suppressed (child session)", { sessionID });
        return;
      }

      const files = pendingBySession.get(sessionID);
      if (!files || files.size === 0) return;
      const fileList = [...files];
      pendingBySession.delete(sessionID);

      log("info", "running format+lint", { sessionID, count: fileList.length });

      // 1. Format
      for (const filePath of fileList) {
        const ext = path.extname(filePath) || path.basename(filePath);
        const formatters = formatterExtMap[ext] ?? [];
        for (const name of formatters) {
          if (disabled.has(name)) continue;
          const def = resolveDef(name, "formatters", config);
          const err = await runTool(filePath, name, def, true);
          if (err) log("warn", "formatter error", { name, filePath, err });
        }
      }

      // 2. Lint + collect errors
      const errors: string[] = [];
      for (const filePath of fileList) {
        const ext = path.extname(filePath) || path.basename(filePath);
        const linters = linterExtMap[ext] ?? [];
        for (const name of linters) {
          if (disabled.has(name)) continue;
          const def = resolveDef(name, "linters", config);
          const err = await runTool(filePath, name, def, false);
          if (err) errors.push(`**${filePath}**\n${err}`);
        }
      }

      // 3. Inject lint report as next user prompt
      if (errors.length > 0) {
        const report = `Lint errors found after the last edit. Fix them:\n\n${errors.join("\n\n")}`;
        log("info", "injecting lint report", {
          sessionID,
          errorCount: errors.length,
        });
        try {
          await client.session.prompt({
            path: { id: sessionID },
            body: {
              parts: [{ type: "text", text: report }],
            },
          });
        } catch (e) {
          log("error", "failed to inject lint report", { error: String(e) });
          process.stderr.write(
            `[opencode-format-lint] Lint errors:\n\n${errors.join("\n\n")}\n`,
          );
        }
      }
    },
  };
};

export default CodefmtPlugin;
