import { afterEach,describe, expect, test, vi } from "vitest";

vi.mock("../runner", () => ({
  executeToolDef: vi.fn(),
}));

import { buildLintReport, formatFiles, lintFiles } from "../processor";
import { executeToolDef } from "../runner";

const mockedExecuteToolDef = vi.mocked(executeToolDef);

afterEach(() => {
  vi.restoreAllMocks();
  mockedExecuteToolDef.mockReset();
});

describe("formatFiles", () => {
  test("calls executeToolDef for each formatter matching the file extension", async () => {
    mockedExecuteToolDef.mockResolvedValue(null);

    await formatFiles(["/project/src/button.ts"], {
      ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
    });

    expect(mockedExecuteToolDef).toHaveBeenCalledWith(
      "/project/src/button.ts",
      {
        name: "prettier",
        kind: "formatter",
        def: {},
      },
    );
  });

  test("runs multiple formatters for the same extension in order", async () => {
    const calls: string[] = [];
    mockedExecuteToolDef.mockImplementation(async (_filePath, tool) => {
      calls.push(tool.name);
      return null;
    });

    await formatFiles(["/project/src/main.py"], {
      ".py": [
        { name: "isort", kind: "formatter", def: {} },
        { name: "black", kind: "formatter", def: {} },
      ],
    });

    expect(calls).toEqual(["isort", "black"]);
  });

  test("skips files with no formatters for their extension", async () => {
    mockedExecuteToolDef.mockResolvedValue(null);

    await formatFiles(["/project/src/main.go"], {
      ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
    });

    expect(mockedExecuteToolDef).not.toHaveBeenCalled();
  });

  test("processes multiple files", async () => {
    mockedExecuteToolDef.mockResolvedValue(null);

    await formatFiles(["/project/a.ts", "/project/b.ts"], {
      ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
    });

    expect(mockedExecuteToolDef).toHaveBeenCalledTimes(2);
  });

  test("logs a warning when a formatter returns an error but does not throw", async () => {
    const { logger } = await import("../logger");
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    mockedExecuteToolDef.mockResolvedValue("[prettier] SyntaxError");

    await formatFiles(["/project/src/button.ts"], {
      ".ts": [{ name: "prettier", kind: "formatter", def: {} }],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "formatter error",
      expect.objectContaining({
        name: "prettier",
        err: "[prettier] SyntaxError",
      }),
    );
  });

  test("uses Dockerfile basename as extension key", async () => {
    mockedExecuteToolDef.mockResolvedValue(null);

    await formatFiles(["/project/Dockerfile"], {
      Dockerfile: [{ name: "hadolint-fmt", kind: "formatter", def: {} }],
    });

    expect(mockedExecuteToolDef).toHaveBeenCalledWith("/project/Dockerfile", {
      name: "hadolint-fmt",
      kind: "formatter",
      def: {},
    });
  });
});

describe("lintFiles", () => {
  test("returns empty array when all linters pass", async () => {
    mockedExecuteToolDef.mockResolvedValue(null);

    const errors = await lintFiles(["/project/src/button.ts"], {
      ".ts": [{ name: "eslint", kind: "linter", def: {} }],
    });

    expect(errors).toEqual([]);
  });

  test("collects error strings from linters that fail", async () => {
    mockedExecuteToolDef.mockResolvedValue("[eslint] no-unused-vars");

    const errors = await lintFiles(["/project/src/button.ts"], {
      ".ts": [{ name: "eslint", kind: "linter", def: {} }],
    });

    expect(errors).toEqual([
      "**/project/src/button.ts**\n[eslint] no-unused-vars",
    ]);
  });

  test("collects errors from multiple files", async () => {
    mockedExecuteToolDef.mockResolvedValue("[eslint] error");

    const errors = await lintFiles(["/project/a.ts", "/project/b.ts"], {
      ".ts": [{ name: "eslint", kind: "linter", def: {} }],
    });

    expect(errors).toHaveLength(2);
  });

  test("skips files with no linters for their extension", async () => {
    mockedExecuteToolDef.mockResolvedValue("[eslint] error");

    const errors = await lintFiles(["/project/src/main.go"], {
      ".ts": [{ name: "eslint", kind: "linter", def: {} }],
    });

    expect(errors).toEqual([]);
    expect(mockedExecuteToolDef).not.toHaveBeenCalled();
  });

  test("collects errors from multiple linters on the same file", async () => {
    mockedExecuteToolDef
      .mockResolvedValueOnce("[eslint] error")
      .mockResolvedValueOnce("[biome] error");

    const errors = await lintFiles(["/project/src/button.ts"], {
      ".ts": [
        { name: "eslint", kind: "linter", def: {} },
        { name: "biome", kind: "linter", def: {} },
      ],
    });

    expect(errors).toHaveLength(2);
  });

  test("only includes errors from linters that failed, not passing ones", async () => {
    mockedExecuteToolDef
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("[biome] error");

    const errors = await lintFiles(["/project/src/button.ts"], {
      ".ts": [
        { name: "eslint", kind: "linter", def: {} },
        { name: "biome", kind: "linter", def: {} },
      ],
    });

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
