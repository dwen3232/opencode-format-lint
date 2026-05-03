// TODO: all of this seems like too much manual config

import type { ToolDef } from "../schemas";
import biome from "./biome";
import black from "./black";
import eslint from "./eslint";
import gofmt from "./gofmt";
import golangciLint from "./golangci-lint";
import hadolint from "./hadolint";
import isort from "./isort";
import markdownlint from "./markdownlint";
import prettier from "./prettier";
import ruff from "./ruff";
import rustfmt from "./rustfmt";
import shellcheck from "./shellcheck";
import shfmt from "./shfmt";
import stylua from "./stylua";

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
