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

// TODO: move this to registry/?
export interface RegistryEntry {
  formatter?: ToolEntry;
  linter?: ToolEntry;
}

// TODO: move this to registry/?
export interface ToolEntry {
  extensions: string[];
  def: ToolDef;
}
