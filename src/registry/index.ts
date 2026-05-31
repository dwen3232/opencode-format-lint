// TODO: all of this seems like too much manual config

import type { ToolDef } from "../schemas";
import biome from "./biome";
import black from "./black";
import clangFormat from "./clang-format";
import clippy from "./clippy";
import cpplint from "./cpplint";
import eslint from "./eslint";
import gofmt from "./gofmt";
import goimports from "./goimports";
import golangciLint from "./golangci-lint";
import googleJavaFormat from "./google-java-format";
import hadolint from "./hadolint";
import htmlhint from "./htmlhint";
import isort from "./isort";
import ktlint from "./ktlint";
import markdownlint from "./markdownlint";
import phpcbf from "./phpcbf";
import phpcs from "./phpcs";
import prettier from "./prettier";
import rubocop from "./rubocop";
import ruff from "./ruff";
import rustfmt from "./rustfmt";
import scalafmt from "./scalafmt";
import shellcheck from "./shellcheck";
import shfmt from "./shfmt";
import sqlfluff from "./sqlfluff";
import stylua from "./stylua";
import terraform from "./terraform";
import tofu from "./tofu";
import yamllint from "./yamllint";

// name → ToolDef for config resolution
export const FORMATTER_DEFAULTS: Record<string, ToolDef> = {
  prettier: prettier.formatter!.def,
  biome: biome.formatter!.def,
  black: black.formatter!.def,
  "clang-format": clangFormat.formatter!.def,
  isort: isort.formatter!.def,
  gofmt: gofmt.formatter!.def,
  goimports: goimports.formatter!.def,
  "google-java-format": googleJavaFormat.formatter!.def,
  ktlint: ktlint.formatter!.def,
  phpcbf: phpcbf.formatter!.def,
  rustfmt: rustfmt.formatter!.def,
  scalafmt: scalafmt.formatter!.def,
  stylua: stylua.formatter!.def,
  sqlfluff: sqlfluff.formatter!.def,
  shfmt: shfmt.formatter!.def,
  terraform: terraform.formatter!.def,
  tofu: tofu.formatter!.def,
};

export const LINTER_DEFAULTS: Record<string, ToolDef> = {
  eslint: eslint.linter!.def,
  biome: biome.linter!.def,
  clippy: clippy.linter!.def,
  cpplint: cpplint.linter!.def,
  ruff: ruff.linter!.def,
  "golangci-lint": golangciLint.linter!.def,
  shellcheck: shellcheck.linter!.def,
  hadolint: hadolint.linter!.def,
  htmlhint: htmlhint.linter!.def,
  ktlint: ktlint.linter!.def,
  markdownlint: markdownlint.linter!.def,
  phpcs: phpcs.linter!.def,
  rubocop: rubocop.linter!.def,
  sqlfluff: sqlfluff.linter!.def,
  yamllint: yamllint.linter!.def,
};
