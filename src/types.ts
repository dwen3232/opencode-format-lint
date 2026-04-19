import type { ToolDef } from "./schemas";

export interface ToolEntry {
  extensions: string[];
  def: ToolDef;
}

export interface RegistryEntry {
  formatter?: ToolEntry;
  linter?: ToolEntry;
}
