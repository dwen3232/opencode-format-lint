import { afterEach, describe, expect, test, vi } from "vitest";

import { buildRuntimeToolMappings, createLoadConfig, resolveToolDef } from "../config";
import { FORMATTER_DEFAULTS, LINTER_DEFAULTS } from "../registry/index";
import type { CodefmtConfig } from "../schemas";

vi.mock("fs");
import fs from "fs";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeLoadConfig() {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    logger,
    loadConfig: createLoadConfig(logger),
  };
}

describe("buildRuntimeToolMappings", () => {
  test("returns no formatter or linter mappings when no extensions are configured", () => {
    const { formatterToolsByExtension, linterToolsByExtension } = buildRuntimeToolMappings({});

    expect(formatterToolsByExtension).toEqual({});
    expect(linterToolsByExtension).toEqual({});
  });

  test("builds formatter mappings only for explicitly configured extensions", () => {
    const { formatterToolsByExtension } = buildRuntimeToolMappings({
      formatters_by_ext: { ".ts": ["prettier"], ".py": ["black", "isort"] },
    });

    expect(formatterToolsByExtension[".ts"].map((tool) => tool.name)).toEqual(["prettier"]);
    expect(formatterToolsByExtension[".py"].map((tool) => tool.name)).toEqual(["black", "isort"]);
  });

  test("builds linter mappings only for explicitly configured extensions", () => {
    const { linterToolsByExtension } = buildRuntimeToolMappings({
      linters_by_ext: { ".ts": ["eslint"], ".py": ["ruff"] },
    });

    expect(linterToolsByExtension[".ts"].map((tool) => tool.name)).toEqual(["eslint"]);
    expect(linterToolsByExtension[".py"].map((tool) => tool.name)).toEqual(["ruff"]);
  });

  test("does not add implicit mappings for extensions omitted from config", () => {
    const { formatterToolsByExtension } = buildRuntimeToolMappings({
      formatters_by_ext: { ".ts": ["biome"] },
    });

    expect(formatterToolsByExtension).not.toHaveProperty(".py");
  });

  test("user config can add a new extension not in the defaults", () => {
    const { formatterToolsByExtension } = buildRuntimeToolMappings({
      formatters_by_ext: { ".svelte": ["prettier"] },
    });

    expect(formatterToolsByExtension[".svelte"].map((tool) => tool.name)).toEqual(["prettier"]);
  });

  test("user config can set an extension to an empty list", () => {
    const { linterToolsByExtension } = buildRuntimeToolMappings({
      linters_by_ext: { ".ts": [] },
    });

    expect(linterToolsByExtension[".ts"]).toEqual([]);
  });

  test("resolved tools include merged tool definitions", () => {
    const { formatterToolsByExtension } = buildRuntimeToolMappings({
      formatters_by_ext: { ".ts": ["prettier"] },
      formatters: {
        prettier: { cmd: "/usr/local/bin/prettier" },
      },
    });

    expect(formatterToolsByExtension[".ts"][0]).toEqual({
      name: "prettier",
      kind: "formatter",
      def: { ...FORMATTER_DEFAULTS.prettier, cmd: "/usr/local/bin/prettier" },
    });
  });
});

describe("resolveToolDef", () => {
  test("returns registry defaults when no user override exists", () => {
    const result = resolveToolDef("prettier", "formatter", {});
    expect(result).toEqual(FORMATTER_DEFAULTS.prettier);
  });

  test("user override merges on top of registry defaults", () => {
    const config: CodefmtConfig = {
      formatters: {
        prettier: { args: ["--write", "--single-quote"] },
      },
    };

    const result = resolveToolDef("prettier", "formatter", config);

    expect(result.args).toEqual(["--write", "--single-quote"]);
    expect(result.markers).toEqual(FORMATTER_DEFAULTS.prettier!.markers);
  });

  test("user override can set require_markers independently", () => {
    const config: CodefmtConfig = {
      linters: {
        ruff: { require_markers: true },
      },
    };

    const result = resolveToolDef("ruff", "linter", config);

    expect(result.require_markers).toBe(true);
    expect(result.args).toEqual(LINTER_DEFAULTS.ruff!.args);
  });

  test("user override can set a custom cmd", () => {
    const config: CodefmtConfig = {
      formatters: {
        prettier: { cmd: "/usr/local/bin/prettier" },
      },
    };

    const result = resolveToolDef("prettier", "formatter", config);

    expect(result.cmd).toBe("/usr/local/bin/prettier");
  });

  test("returns an empty object for an unknown tool with no override", () => {
    const result = resolveToolDef("unknown-tool", "formatter", {});
    expect(result).toEqual({});
  });

  test("user override for unknown tool returns the override as-is", () => {
    const config: CodefmtConfig = {
      formatters: {
        "my-formatter": { cmd: "my-fmt", args: ["--fix"] },
      },
    };

    const result = resolveToolDef("my-formatter", "formatter", config);

    expect(result).toEqual({ cmd: "my-fmt", args: ["--fix"] });
  });
});

describe("loadConfig", () => {
  test("returns empty object when no config file exists", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
      if (String(p).endsWith("/package.json")) {
        return JSON.stringify({
          name: "opencode-format-lint",
          version: "0.1.0",
        });
      }

      throw new Error(`Unexpected read for ${String(p)}`);
    });
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    const { loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(result).toEqual({});
  });

  test("writes a default user config with a pinned schema URL when no config exists", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
      if (String(p).endsWith("/package.json")) {
        return JSON.stringify({
          name: "opencode-format-lint",
          version: "0.1.0",
        });
      }

      throw new Error(`Unexpected read for ${String(p)}`);
    });
    const mkdirSync = vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    const writeFileSync = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    const { loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(result).toEqual({});
    expect(mkdirSync).toHaveBeenCalledWith(`${process.env.HOME ?? "~"}/.config/opencode`, {
      recursive: true,
    });
    expect(writeFileSync).toHaveBeenCalledWith(
      `${process.env.HOME ?? "~"}/.config/opencode/codefmt.json`,
      `${JSON.stringify(
        {
          $schema: "https://unpkg.com/opencode-format-lint@0.1.0/codefmt.schema.json",
        },
        null,
        2,
      )}\n`,
    );
  });

  test("returns parsed config when project-level config is valid", () => {
    vi.spyOn(fs, "existsSync").mockImplementation(
      (p) => p === "/some/project/.opencode/codefmt.json",
    );
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({ formatters_by_ext: { ".ts": ["biome"] } }),
    );
    const { loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(result).toEqual({ formatters_by_ext: { ".ts": ["biome"] } });
  });

  test("strips unknown keys from the config", () => {
    vi.spyOn(fs, "existsSync").mockImplementation(
      (p) => p === "/some/project/.opencode/codefmt.json",
    );
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({
        formatters_by_ext: { ".ts": ["biome"] },
        unknownField: true,
      }),
    );
    const { loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(result).not.toHaveProperty("unknownField");
  });

  test("falls through to user-level config when project config is absent", () => {
    const home = process.env.HOME ?? "~";
    vi.spyOn(fs, "existsSync").mockImplementation(
      (p) => p === `${home}/.config/opencode/codefmt.json`,
    );
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({ formatters_by_ext: { ".ts": ["prettier"] } }),
    );
    const { loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(result).toEqual({ formatters_by_ext: { ".ts": ["prettier"] } });
  });

  test("skips an invalid config and continues to the next location", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
      if (p === "/some/project/.opencode/codefmt.json") {
        return JSON.stringify({ formatters_by_ext: "not-an-object" });
      }
      return JSON.stringify({ formatters_by_ext: { ".ts": ["prettier"] } });
    });
    const { logger, loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("/some/project/.opencode/codefmt.json"),
      expect.any(Object),
    );
    expect(result.formatters_by_ext).toEqual({ ".ts": ["prettier"] });
  });

  test("returns empty object when config file contains invalid JSON", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("{ not valid json }");
    const { logger, loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("/some/project/.opencode/codefmt.json"),
    );
    expect(result).toEqual({});
  });

  test("does not write a default config when project config exists", () => {
    vi.spyOn(fs, "existsSync").mockImplementation(
      (p) => p === "/some/project/.opencode/codefmt.json",
    );
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({ formatters_by_ext: { ".ts": ["biome"] } }),
    );
    const mkdirSync = vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
    const writeFileSync = vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
    const { loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(result).toEqual({ formatters_by_ext: { ".ts": ["biome"] } });
    expect(mkdirSync).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  test("logs a warning and returns empty object when writing the default config fails", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    vi.spyOn(fs, "readFileSync").mockImplementation((p) => {
      if (String(p).endsWith("/package.json")) {
        return JSON.stringify({
          name: "opencode-format-lint",
          version: "0.1.0",
        });
      }

      throw new Error(`Unexpected read for ${String(p)}`);
    });
    vi.spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("disk full");
    });
    const { logger, loadConfig } = makeLoadConfig();

    const result = loadConfig("/some/project");

    expect(result).toEqual({});
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`${process.env.HOME ?? "~"}/.config/opencode/codefmt.json`),
      expect.objectContaining({ error: expect.stringContaining("disk full") }),
    );
  });
});
