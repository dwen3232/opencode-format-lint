import { describe, test, expect, vi, afterEach } from "vitest";
import { buildExtensionToToolsMap, resolveDef, loadConfig } from "../config";
import {
  FORMATTER_DEFAULTS,
  LINTER_DEFAULTS,
  DEFAULT_FORMATTER_EXTENSIONS,
  DEFAULT_LINTER_EXTENSIONS,
} from "../registry/index";
import type { CodefmtConfig } from "../schemas";
import { logger } from "../logger";

vi.mock("fs");
import fs from "fs";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildExtensionToToolsMap", () => {
  test("inverts the default name→extensions registry into extension→names", () => {
    const result = buildExtensionToToolsMap(
      "formatters",
      {},
      DEFAULT_FORMATTER_EXTENSIONS,
    );
    expect(result[".ts"]).toContain("prettier");
    expect(result[".py"]).toContain("black");
    expect(result[".py"]).toContain("isort");
    expect(result[".go"]).toContain("gofmt");
  });

  test("user formatters_by_ext fully replaces the default for that extension", () => {
    const config: CodefmtConfig = {
      formatters_by_ext: { ".ts": ["biome"] },
    };
    const result = buildExtensionToToolsMap(
      "formatters",
      config,
      DEFAULT_FORMATTER_EXTENSIONS,
    );
    expect(result[".ts"]).toEqual(["biome"]);
  });

  test("user linters_by_ext fully replaces the default for that extension", () => {
    const config: CodefmtConfig = {
      linters_by_ext: { ".ts": ["biome"] },
    };
    const result = buildExtensionToToolsMap(
      "linters",
      config,
      DEFAULT_LINTER_EXTENSIONS,
    );
    expect(result[".ts"]).toEqual(["biome"]);
  });

  test("user config only replaces specified extensions, leaving others intact", () => {
    const config: CodefmtConfig = {
      formatters_by_ext: { ".ts": ["biome"] },
    };
    const result = buildExtensionToToolsMap(
      "formatters",
      config,
      DEFAULT_FORMATTER_EXTENSIONS,
    );
    expect(result[".py"]).toContain("black");
  });

  test("user config can add a new extension not in the defaults", () => {
    const config: CodefmtConfig = {
      formatters_by_ext: { ".svelte": ["prettier"] },
    };
    const result = buildExtensionToToolsMap(
      "formatters",
      config,
      DEFAULT_FORMATTER_EXTENSIONS,
    );
    expect(result[".svelte"]).toEqual(["prettier"]);
  });

  test("user config can set an extension to an empty list to disable all tools for it", () => {
    const config: CodefmtConfig = {
      linters_by_ext: { ".ts": [] },
    };
    const result = buildExtensionToToolsMap(
      "linters",
      config,
      DEFAULT_LINTER_EXTENSIONS,
    );
    expect(result[".ts"]).toEqual([]);
  });
});

describe("resolveDef", () => {
  test("returns registry defaults when no user override exists", () => {
    const result = resolveDef("prettier", "formatters", {});
    expect(result).toEqual(FORMATTER_DEFAULTS["prettier"]);
  });

  test("user override merges on top of registry defaults", () => {
    const config: CodefmtConfig = {
      formatters: {
        prettier: { args: ["--write", "--single-quote"] },
      },
    };
    const result = resolveDef("prettier", "formatters", config);
    expect(result.args).toEqual(["--write", "--single-quote"]);
    expect(result.markers).toEqual(FORMATTER_DEFAULTS["prettier"]!.markers);
  });

  test("user override can set require_markers independently", () => {
    const config: CodefmtConfig = {
      linters: {
        ruff: { require_markers: true },
      },
    };
    const result = resolveDef("ruff", "linters", config);
    expect(result.require_markers).toBe(true);
    expect(result.args).toEqual(LINTER_DEFAULTS["ruff"]!.args);
  });

  test("user override can set a custom cmd", () => {
    const config: CodefmtConfig = {
      formatters: {
        prettier: { cmd: "/usr/local/bin/prettier" },
      },
    };
    const result = resolveDef("prettier", "formatters", config);
    expect(result.cmd).toBe("/usr/local/bin/prettier");
  });

  test("returns an empty object for an unknown tool with no override", () => {
    const result = resolveDef("unknown-tool", "formatters", {});
    expect(result).toEqual({});
  });

  test("user override for unknown tool returns the override as-is", () => {
    const config: CodefmtConfig = {
      formatters: {
        "my-formatter": { cmd: "my-fmt", args: ["--fix"] },
      },
    };
    const result = resolveDef("my-formatter", "formatters", config);
    expect(result).toEqual({ cmd: "my-fmt", args: ["--fix"] });
  });
});

describe("loadConfig", () => {
  test("returns empty object when no config file exists", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    const result = loadConfig("/some/project");
    expect(result).toEqual({});
  });

  test("returns parsed config when project-level config is valid", () => {
    vi.spyOn(fs, "existsSync").mockImplementation(
      (p) => p === "/some/project/.opencode/codefmt.json",
    );
    vi.spyOn(fs, "readFileSync").mockReturnValue(
      JSON.stringify({ formatters_by_ext: { ".ts": ["biome"] } }),
    );
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
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const result = loadConfig("/some/project");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("/some/project/.opencode/codefmt.json"),
      expect.any(Object),
    );
    expect(result.formatters_by_ext).toEqual({ ".ts": ["prettier"] });
  });

  test("returns empty object when config file contains invalid JSON", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "readFileSync").mockReturnValue("{ not valid json }");
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
    const result = loadConfig("/some/project");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("/some/project/.opencode/codefmt.json"),
    );
    expect(result).toEqual({});
  });
});
