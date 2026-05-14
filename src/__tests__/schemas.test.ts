import { describe, expect, test } from "vitest";

import { CodefmtConfigJsonSchema } from "../schemas";

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
});
