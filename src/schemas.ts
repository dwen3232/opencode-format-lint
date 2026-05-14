import { z } from "zod";

export const ToolDefSchema = z.object({
  cmd: z
    .string()
    .optional()
    .describe("Override the binary path. Defaults to the tool name on $PATH."),
  args: z
    .array(z.string())
    .optional()
    .describe(
      "Arguments passed to the tool. Replaces the built-in defaults entirely if they exist.",
    ),
  markers: z
    .array(z.string())
    .optional()
    .describe(
      "Filenames that indicate a project root. " +
        "The plugin walks up from the edited file to find them.",
    ),
  require_markers: z
    .boolean()
    .optional()
    .describe("If true, skip this tool silently when no marker is found. Defaults to false."),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe("Environment variables to set for this tool's process."),
});

export const CodefmtConfigSchema = z.object({
  formatters_by_ext: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe(
      "Map of file extension to ordered list of formatter names to run. " +
        "Overrides built-in defaults for that extension entirely.",
    ),
  linters_by_ext: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .describe(
      "Map of file extension to ordered list of linter names to run. " +
        "Overrides built-in defaults for that extension entirely.",
    ),
  formatters: z
    .record(z.string(), ToolDefSchema)
    .optional()
    .describe(
      "Per-formatter overrides merged on top of built-in defaults. Keys are formatter names.",
    ),
  linters: z
    .record(z.string(), ToolDefSchema)
    .optional()
    .describe("Per-linter overrides merged on top of built-in defaults. Keys are linter names."),
});

export const CodefmtConfigJsonSchema = z.toJSONSchema(CodefmtConfigSchema, {
  target: "draft-07",
});

export type ToolDef = z.infer<typeof ToolDefSchema>;
export type CodefmtConfig = z.infer<typeof CodefmtConfigSchema>;
