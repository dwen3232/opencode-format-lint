import { describe, test, expect, vi, afterEach } from "vitest";
import path from "path";
import type { BunShellOutput } from "@opencode-ai/plugin/dist/shell.js";

vi.mock("fs");
import fs from "fs";

import { findRoot, runTool } from "../runner";
import { shell } from "../shell";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeShellOutput(
  exitCode: number,
  stdout = "",
  stderr = "",
): BunShellOutput {
  return {
    exitCode,
    stdout: Buffer.from(stdout),
    stderr: Buffer.from(stderr),
    text: () => stdout,
    json: () => JSON.parse(stdout),
    arrayBuffer: () => new ArrayBuffer(0),
    bytes: () => new Uint8Array(),
    blob: () => new Blob([stdout]),
  };
}

function makeShell(output: BunShellOutput) {
  const promise = Object.assign(Promise.resolve(output), {
    cwd: () => promise,
    env: () => promise,
    quiet: () => promise,
    nothrow: () => promise,
    stdin: new WritableStream(),
    lines: async function* () {},
    text: () => Promise.resolve(""),
    json: () => Promise.resolve(null),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    throws: () => promise,
  });

  const shell = Object.assign(vi.fn().mockReturnValue(promise), {
    braces: vi.fn(),
    escape: vi.fn(),
    env: vi.fn().mockReturnThis(),
    cwd: vi.fn().mockReturnThis(),
    nothrow: vi.fn().mockReturnThis(),
    throws: vi.fn().mockReturnThis(),
  });

  return shell;
}

describe("findRoot", () => {
  test("returns null when markers list is empty", () => {
    const result = findRoot("/some/deep/path/file.ts", []);
    expect(result).toBeNull();
  });

  test("returns the directory containing the marker", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      return p === "/project/.prettierrc";
    });

    const result = findRoot("/project/src/components/Button.ts", [
      ".prettierrc",
    ]);
    expect(result).toBe("/project");
  });

  test("returns the closest ancestor when marker exists in multiple directories", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      return p === "/project/src/.prettierrc" || p === "/project/.prettierrc";
    });

    const result = findRoot("/project/src/components/Button.ts", [
      ".prettierrc",
    ]);
    expect(result).toBe("/project/src");
  });

  test("returns null when no ancestor contains the marker", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const result = findRoot("/project/src/file.ts", [".prettierrc"]);
    expect(result).toBeNull();
  });

  test("checks all markers at each directory level before moving up", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      return p === "/project/biome.json";
    });

    const result = findRoot("/project/src/file.ts", [
      "biome.json",
      "biome.jsonc",
    ]);
    expect(result).toBe("/project");
  });

  test("returns the file's own directory when the marker is there", () => {
    vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      return p === path.join("/project/src", ".prettierrc");
    });

    const result = findRoot("/project/src/file.ts", [".prettierrc"]);
    expect(result).toBe("/project/src");
  });
});

describe("runTool", () => {
  test("returns null when require_markers is true and no marker is found", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const result = await runTool(
      "/project/src/file.ts",
      "eslint",
      {
        args: ["--format", "json"],
        markers: ["eslint.config.js"],
        require_markers: true,
      },
      false,
    );

    expect(result).toBeNull();
  });

  test("returns null when formatter exits zero", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    shell.setBackend(makeShell(makeShellOutput(0)) as any);

    const result = await runTool(
      "/project/src/file.ts",
      "prettier",
      {
        args: ["--write"],
        markers: [],
        require_markers: false,
      },
      true,
    );

    expect(result).toBeNull();
  });

  test("returns null when formatter exits non-zero but stderr is empty", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    shell.setBackend(makeShell(makeShellOutput(1, "", "")) as any);

    const result = await runTool(
      "/project/src/file.ts",
      "prettier",
      {
        args: ["--write"],
        markers: [],
        require_markers: false,
      },
      true,
    );

    expect(result).toBeNull();
  });

  test("returns error string when formatter exits non-zero with stderr", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    shell.setBackend(
      makeShell(makeShellOutput(1, "", "SyntaxError: unexpected token")) as any,
    );

    const result = await runTool(
      "/project/src/file.ts",
      "prettier",
      {
        args: ["--write"],
        markers: [],
        require_markers: false,
      },
      true,
    );

    expect(result).toBe("[prettier] SyntaxError: unexpected token");
  });

  test("returns null when linter exits zero", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    shell.setBackend(makeShell(makeShellOutput(0)) as any);

    const result = await runTool(
      "/project/src/file.ts",
      "ruff",
      {
        args: ["check", "--output-format", "json"],
        markers: [],
        require_markers: false,
      },
      false,
    );

    expect(result).toBeNull();
  });

  test("returns stdout when linter exits non-zero with stdout output", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    shell.setBackend(
      makeShell(makeShellOutput(1, '[{"code": "E501"}]', "")) as any,
    );

    const result = await runTool(
      "/project/src/file.ts",
      "ruff",
      {
        args: ["check", "--output-format", "json"],
        markers: [],
        require_markers: false,
      },
      false,
    );

    expect(result).toBe('[ruff] [{"code": "E501"}]');
  });

  test("returns exit code when linter exits non-zero with no output", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);
    shell.setBackend(makeShell(makeShellOutput(1, "", "")) as any);

    const result = await runTool(
      "/project/src/file.ts",
      "ruff",
      {
        args: ["check"],
        markers: [],
        require_markers: false,
      },
      false,
    );

    expect(result).toBe("[ruff] exit code 1");
  });
});
