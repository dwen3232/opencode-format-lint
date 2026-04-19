import { describe, test, expect, vi, afterEach } from "vitest";
import { formatFiles, lintFiles, buildLintReport } from "../processor";
import type { RunToolFn } from "../runner";

afterEach(() => {
  vi.restoreAllMocks();
});

const noopRunTool: RunToolFn = async () => null;

describe("formatFiles", () => {
  test("calls runTool for each formatter matching the file extension", async () => {
    const runTool = vi.fn<RunToolFn>().mockResolvedValue(null);

    await formatFiles(
      ["/project/src/button.ts"],
      { ".ts": ["prettier"] },
      {},
      runTool,
    );

    expect(runTool).toHaveBeenCalledWith(
      "/project/src/button.ts",
      "prettier",
      expect.any(Object),
      true,
    );
  });

  test("runs multiple formatters for the same extension in order", async () => {
    const calls: string[] = [];
    const runTool = vi.fn<RunToolFn>().mockImplementation(async (_f, name) => {
      calls.push(name);
      return null;
    });

    await formatFiles(
      ["/project/src/main.py"],
      { ".py": ["isort", "black"] },
      {},
      runTool,
    );

    expect(calls).toEqual(["isort", "black"]);
  });

  test("skips files with no formatters for their extension", async () => {
    const runTool = vi.fn<RunToolFn>().mockResolvedValue(null);

    await formatFiles(
      ["/project/src/main.go"],
      { ".ts": ["prettier"] },
      {},
      runTool,
    );

    expect(runTool).not.toHaveBeenCalled();
  });

  test("processes multiple files", async () => {
    const runTool = vi.fn<RunToolFn>().mockResolvedValue(null);

    await formatFiles(
      ["/project/a.ts", "/project/b.ts"],
      { ".ts": ["prettier"] },
      {},
      runTool,
    );

    expect(runTool).toHaveBeenCalledTimes(2);
  });

  test("logs a warning when a formatter returns an error but does not throw", async () => {
    const { logger } = await import("../logger.js");
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const runTool = vi
      .fn<RunToolFn>()
      .mockResolvedValue("[prettier] SyntaxError");

    await formatFiles(
      ["/project/src/button.ts"],
      { ".ts": ["prettier"] },
      {},
      runTool,
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "formatter error",
      expect.objectContaining({
        name: "prettier",
        err: "[prettier] SyntaxError",
      }),
    );
  });

  test("uses Dockerfile basename as extension key", async () => {
    const runTool = vi.fn<RunToolFn>().mockResolvedValue(null);

    await formatFiles(
      ["/project/Dockerfile"],
      { Dockerfile: ["hadolint-fmt"] },
      {},
      runTool,
    );

    expect(runTool).toHaveBeenCalledWith(
      "/project/Dockerfile",
      "hadolint-fmt",
      expect.any(Object),
      true,
    );
  });
});

describe("lintFiles", () => {
  test("returns empty array when all linters pass", async () => {
    const errors = await lintFiles(
      ["/project/src/button.ts"],
      { ".ts": ["eslint"] },
      {},
      noopRunTool,
    );

    expect(errors).toEqual([]);
  });

  test("collects error strings from linters that fail", async () => {
    const runTool = vi
      .fn<RunToolFn>()
      .mockResolvedValue("[eslint] no-unused-vars");

    const errors = await lintFiles(
      ["/project/src/button.ts"],
      { ".ts": ["eslint"] },
      {},
      runTool,
    );

    expect(errors).toEqual([
      "**\/project/src/button.ts**\n[eslint] no-unused-vars",
    ]);
  });

  test("collects errors from multiple files", async () => {
    const runTool = vi.fn<RunToolFn>().mockResolvedValue("[eslint] error");

    const errors = await lintFiles(
      ["/project/a.ts", "/project/b.ts"],
      { ".ts": ["eslint"] },
      {},
      runTool,
    );

    expect(errors).toHaveLength(2);
  });

  test("skips files with no linters for their extension", async () => {
    const runTool = vi.fn<RunToolFn>().mockResolvedValue("[eslint] error");

    const errors = await lintFiles(
      ["/project/src/main.go"],
      { ".ts": ["eslint"] },
      {},
      runTool,
    );

    expect(errors).toEqual([]);
    expect(runTool).not.toHaveBeenCalled();
  });

  test("collects errors from multiple linters on the same file", async () => {
    const runTool = vi
      .fn<RunToolFn>()
      .mockResolvedValueOnce("[eslint] error")
      .mockResolvedValueOnce("[biome] error");

    const errors = await lintFiles(
      ["/project/src/button.ts"],
      { ".ts": ["eslint", "biome"] },
      {},
      runTool,
    );

    expect(errors).toHaveLength(2);
  });

  test("only includes errors from linters that failed, not passing ones", async () => {
    const runTool = vi
      .fn<RunToolFn>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("[biome] error");

    const errors = await lintFiles(
      ["/project/src/button.ts"],
      { ".ts": ["eslint", "biome"] },
      {},
      runTool,
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("[biome] error");
  });
});

describe("buildLintReport", () => {
  test("includes the fixed header", () => {
    const report = buildLintReport(["error one"]);
    expect(report).toMatch(
      /^Lint errors found after the last edit\. Fix them:/,
    );
  });

  test("joins multiple errors with double newlines", () => {
    const report = buildLintReport(["error one", "error two"]);
    expect(report).toContain("error one\n\nerror two");
  });

  test("includes a single error verbatim", () => {
    const report = buildLintReport(["**file.ts**\n[eslint] no-unused-vars"]);
    expect(report).toContain("**file.ts**\n[eslint] no-unused-vars");
  });
});
