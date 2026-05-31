import { describe, expect, test } from "vitest";

import { CodefmtConfigJsonSchema, CodefmtConfigSchema } from "../schemas";

describe("CodefmtConfigJsonSchema", () => {
  test("describes the config object structure in draft-07 compatible JSON Schema", () => {
    expect(CodefmtConfigJsonSchema).toMatchObject({
      type: "object",
      additionalProperties: false,
      properties: {
        formatters_by_ext: {
          type: "object",
          description: expect.stringContaining("Map of file extension"),
          additionalProperties: {
            type: "array",
            items: { type: "string" },
          },
        },
        linters_by_ext: {
          type: "object",
          description: expect.stringContaining("Map of file extension"),
          additionalProperties: {
            type: "array",
            items: { type: "string" },
          },
        },
        formatters: {
          type: "object",
          additionalProperties: {
            type: "object",
            additionalProperties: false,
            properties: {
              cmd: { type: "string" },
              args: {
                type: "array",
                items: { type: "string" },
              },
              markers: {
                type: "array",
                items: { type: "string" },
              },
              require_markers: { type: "boolean" },
              append_path: { type: "boolean", default: true },
              env: {
                type: "object",
                additionalProperties: { type: "string" },
              },
            },
          },
        },
      },
    });
  });

  test("defaults append_path to true for parsed tool overrides", () => {
    const result = CodefmtConfigSchema.parse({
      formatters: {
        prettier: {
          args: ["--write"],
        },
      },
    });

    expect(result.formatters?.prettier.append_path).toBe(true);
  });
});
