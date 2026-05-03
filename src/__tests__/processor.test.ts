import { afterEach, describe, expect, test, vi } from "vitest";

import { buildLintReport, createProcessor } from "../processor";

afterEach(() => {
  vi.restoreAllMocks();
});

function createTestProcessor() {
  const executeToolDef = vi.fn();
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    executeToolDef,
    logger,
    ...createProcessor({ executeToolDef, logger }),
  };
}

describe("formatFiles", () => {
  test("calls executeToolDef for each formatter matching the file extension", async () => {
    const { executeToolDef, formatFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue(null);

    await formatFiles(
      ["/project/src/button.ts"],
      {
        ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
      },
      "/project",
    );

    expect(executeToolDef).toHaveBeenCalledWith(
      "/project/src/button.ts",
      {
        name: "prettier",
        kind: "formatter",
        def: {},
      },
      "/project",
    );
  });

  test("runs multiple formatters for the same extension in order", async () => {
    const { executeToolDef, formatFiles } = createTestProcessor();
    const calls: string[] = [];
    executeToolDef.mockImplementation(async (_filePath, tool) => {
      calls.push(tool.name);
      return null;
    });

    await formatFiles(
      ["/project/src/main.py"],
      {
        ".py": [
          { name: "isort", kind: "formatter", def: {} },
          { name: "black", kind: "formatter", def: {} },
        ],
      },
      "/project",
    );

    expect(calls).toEqual(["isort", "black"]);
  });

  test("skips files with no formatters for their extension", async () => {
    const { executeToolDef, formatFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue(null);

    await formatFiles(
      ["/project/src/main.go"],
      {
        ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
      },
      "/project",
    );

    expect(executeToolDef).not.toHaveBeenCalled();
  });

  test("processes multiple files", async () => {
    const { executeToolDef, formatFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue(null);

    await formatFiles(
      ["/project/a.ts", "/project/b.ts"],
      {
        ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
      },
      "/project",
    );

    expect(executeToolDef).toHaveBeenCalledTimes(2);
  });

  test("logs a warning when a formatter returns an error but does not throw", async () => {
    const { executeToolDef, formatFiles, logger } = createTestProcessor();
    executeToolDef.mockResolvedValue("[prettier] SyntaxError");

    await formatFiles(
      ["/project/src/button.ts"],
      {
        ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
      },
      "/project",
    );

    expect(logger.warn).toHaveBeenCalledWith(
      "formatter error",
      expect.objectContaining({
        name: "prettier",
        err: "[prettier] SyntaxError",
      }),
    );
  });

  test("uses Dockerfile basename as extension key", async () => {
    const { executeToolDef, formatFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue(null);

    await formatFiles(
      ["/project/Dockerfile"],
      {
        Dockerfile: [{ name: "hadolint-fmt", kind: "formatter", def: {} }],
      },
      "/project",
    );

    expect(executeToolDef).toHaveBeenCalledWith(
      "/project/Dockerfile",
      {
        name: "hadolint-fmt",
        kind: "formatter",
        def: {},
      },
      "/project",
    );
  });
});

describe("lintFiles", () => {
  test("returns empty array when all linters pass", async () => {
    const { executeToolDef, lintFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue(null);

    const errors = await lintFiles(
      ["/project/src/button.ts"],
      {
        ".ts": [{ name: "eslint", kind: "linter", def: {} }],
      },
      "/project",
    );

    expect(errors).toEqual([]);
  });

  test("collects error strings from linters that fail", async () => {
    const { executeToolDef, lintFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue("[eslint] no-unused-vars");

    const errors = await lintFiles(
      ["/project/src/button.ts"],
      {
        ".ts": [{ name: "eslint", kind: "linter", def: {} }],
      },
      "/project",
    );

    expect(errors).toEqual(["**/project/src/button.ts**\n[eslint] no-unused-vars"]);
  });

  test("collects errors from multiple files", async () => {
    const { executeToolDef, lintFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue("[eslint] error");

    const errors = await lintFiles(
      ["/project/a.ts", "/project/b.ts"],
      {
        ".ts": [{ name: "eslint", kind: "linter", def: {} }],
      },
      "/project",
    );

    expect(errors).toHaveLength(2);
  });

  test("skips files with no linters for their extension", async () => {
    const { executeToolDef, lintFiles } = createTestProcessor();
    executeToolDef.mockResolvedValue("[eslint] error");

    const errors = await lintFiles(
      ["/project/src/main.go"],
      {
        ".ts": [{ name: "eslint", kind: "linter", def: {} }],
      },
      "/project",
    );

    expect(errors).toEqual([]);
    expect(executeToolDef).not.toHaveBeenCalled();
  });

  test("collects errors from multiple linters on the same file", async () => {
    const { executeToolDef, lintFiles } = createTestProcessor();
    executeToolDef.mockResolvedValueOnce("[eslint] error").mockResolvedValueOnce("[biome] error");

    const errors = await lintFiles(
      ["/project/src/button.ts"],
      {
        ".ts": [
          { name: "eslint", kind: "linter", def: {} },
          { name: "biome", kind: "linter", def: {} },
        ],
      },
      "/project",
    );

    expect(errors).toHaveLength(2);
  });

  test("only includes errors from linters that failed, not passing ones", async () => {
    const { executeToolDef, lintFiles } = createTestProcessor();
    executeToolDef.mockResolvedValueOnce(null).mockResolvedValueOnce("[biome] error");

    const errors = await lintFiles(
      ["/project/src/button.ts"],
      {
        ".ts": [
          { name: "eslint", kind: "linter", def: {} },
          { name: "biome", kind: "linter", def: {} },
        ],
      },
      "/project",
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("[biome] error");
  });
});

describe("buildLintReport", () => {
  test("includes the fixed header", () => {
    const report = buildLintReport(["error one"]);
    expect(report).toMatch(/^Lint errors found after the last edit\. Fix them:/);
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
