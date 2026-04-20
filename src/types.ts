import type { ToolDef } from "./schemas";

export type ToolKind = "formatter" | "linter";

export interface RuntimeToolMappings {
  formatterToolsByExtension: Record<string, ResolvedTool[]>;
  linterToolsByExtension: Record<string, ResolvedTool[]>;
}

export interface ResolvedTool {
  name: string;
  kind: ToolKind;
  def: ToolDef;
}

// Registry types
export interface RegistryEntry {
  formatter?: ToolEntry;
  linter?: ToolEntry;
}

export interface ToolEntry {
  extensions: string[];
  def: ToolDef;
}
