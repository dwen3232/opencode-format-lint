import type { ToolDef } from "../schemas";
import prettier from "./prettier";
import biome from "./biome";
import black from "./black";
import isort from "./isort";
import gofmt from "./gofmt";
import rustfmt from "./rustfmt";
import stylua from "./stylua";
import shfmt from "./shfmt";
import eslint from "./eslint";
import ruff from "./ruff";
import golangciLint from "./golangci-lint";
import shellcheck from "./shellcheck";
import hadolint from "./hadolint";
import markdownlint from "./markdownlint";

// name → ToolDef for config resolution
export const FORMATTER_DEFAULTS: Record<string, ToolDef> = {
  prettier: prettier.formatter!.def,
  biome: biome.formatter!.def,
  black: black.formatter!.def,
  isort: isort.formatter!.def,
  gofmt: gofmt.formatter!.def,
  rustfmt: rustfmt.formatter!.def,
  stylua: stylua.formatter!.def,
  shfmt: shfmt.formatter!.def,
};

export const LINTER_DEFAULTS: Record<string, ToolDef> = {
  eslint: eslint.linter!.def,
  biome: biome.linter!.def,
  ruff: ruff.linter!.def,
  "golangci-lint": golangciLint.linter!.def,
  shellcheck: shellcheck.linter!.def,
  hadolint: hadolint.linter!.def,
  markdownlint: markdownlint.linter!.def,
};

// name → extensions[] for building the extension-to-tools map
export const DEFAULT_FORMATTER_EXTENSIONS: Record<string, string[]> = {
  prettier: prettier.formatter!.extensions,
  biome: biome.formatter!.extensions,
  black: black.formatter!.extensions,
  isort: isort.formatter!.extensions,
  gofmt: gofmt.formatter!.extensions,
  rustfmt: rustfmt.formatter!.extensions,
  stylua: stylua.formatter!.extensions,
  shfmt: shfmt.formatter!.extensions,
};

export const DEFAULT_LINTER_EXTENSIONS: Record<string, string[]> = {
  eslint: eslint.linter!.extensions,
  biome: biome.linter!.extensions,
  ruff: ruff.linter!.extensions,
  "golangci-lint": golangciLint.linter!.extensions,
  shellcheck: shellcheck.linter!.extensions,
  hadolint: hadolint.linter!.extensions,
  markdownlint: markdownlint.linter!.extensions,
};
