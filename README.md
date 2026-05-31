# opencode-format-lint

[![npm version](https://img.shields.io/npm/v/opencode-format-lint.svg)](https://www.npmjs.com/package/opencode-format-lint)
[![npm downloads](https://img.shields.io/npm/dm/opencode-format-lint.svg)](https://www.npmjs.com/package/opencode-format-lint)
[![GitHub stars](https://img.shields.io/github/stars/dwen3232/opencode-format-lint.svg)](https://github.com/dwen3232/opencode-format-lint/stargazers)
[![Build status](https://img.shields.io/github/actions/workflow/status/dwen3232/opencode-format-lint/publish.yml?branch=main)](https://github.com/dwen3232/opencode-format-lint/actions/workflows/publish.yml)
[![License](https://img.shields.io/npm/l/opencode-format-lint.svg)](./LICENSE)

An [OpenCode](https://opencode.ai) plugin that tracks edited files during an agent turn, runs configured formatters first, then runs configured linters, and injects lint failures back into the session.

This project is heavily inspired by [nvim-lint](https://github.com/mfussenegger/nvim-lint) and [conform.nvim](https://github.com/stevearc/conform.nvim): small scope, explicit configuration, strong built-in defaults, and easy custom overrides.

- [Motivation](#motivation)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Built-In Registry](#built-in-registry)
- [Examples](#examples)
- [Custom Tools And Overrides](#custom-tools-and-overrides)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [Development](#development)

## Motivation

OpenCode already gives agents powerful file-editing tools. This plugin adds one narrow behavior on top:

- track files changed via `edit`, `write`, and `apply_patch`
- wait until the root session becomes idle
- run formatters in order for each edited file
- run linters in order for each edited file
- push lint failures back into the session so the agent can fix them

It does not try to be a task runner, build system, or full project health checker. It only reacts to file edits and only runs the tools you explicitly configure.

## Installation

Install the package in the environment where OpenCode resolves plugins:

```bash
bun add opencode-format-lint
```

Then register the plugin in your OpenCode config at `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-format-lint"]
}
```

For local development, you can also point OpenCode directly at this repository:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["/path/to/opencode-format-lint/src/index.ts"]
}
```

## Quick Start

Create a project config at `.opencode/codefmt.json`:

```json
{
  "$schema": "https://unpkg.com/opencode-format-lint@<version>/codefmt.schema.json",
  "formatters_by_ext": {
    ".ts": ["prettier"],
    ".tsx": ["prettier"],
    ".js": ["prettier"]
  },
  "linters_by_ext": {
    ".ts": ["eslint"],
    ".tsx": ["eslint"],
    ".js": ["eslint"]
  }
}
```

Replace `<version>` with the installed package version.

Now when an agent edits `*.ts`, `*.tsx`, or `*.js` files using `edit`, `write`, or `apply_patch`, the plugin will:

1. wait for the session to go idle
2. run `prettier --write <file>`
3. run `eslint --format json <file>`
4. inject any lint errors back into the session

Python example:

```json
{
  "formatters_by_ext": {
    ".py": ["isort", "black"]
  },
  "linters_by_ext": {
    ".py": ["ruff"]
  }
}
```

## How It Works

The runtime behavior is intentionally simple.

1. The plugin tracks file edits from `edit`, `write`, and `apply_patch`.
2. Tracked files are deduplicated per root session ID.
3. Child-session edits roll up to the parent root session.
4. Nothing runs until the root session emits `session.idle`.
5. Formatters run before linters.
6. Formatter failures are logged.
7. Linter failures are injected back into the session with `client.session.prompt`.

Important limitations:

- File changes made through `bash` are invisible to the tracker.
- If a tool requires markers and none are found, that tool is skipped.
- Only extensions you explicitly configure are active.

## Configuration

Runtime config file name: `codefmt.json`

Published JSON Schema:

- `https://unpkg.com/opencode-format-lint@<version>/codefmt.schema.json`

Load order:

1. `.opencode/codefmt.json` in the current project
2. `~/.config/opencode/codefmt.json`

The first valid file wins. Config files are not merged across locations. Unknown keys are stripped.

If neither file exists, the plugin creates `~/.config/opencode/codefmt.json` automatically with a pinned `"$schema"` URL for the installed package version.

### Top-Level Shape

```json
{
  "$schema": "https://unpkg.com/opencode-format-lint@<version>/codefmt.schema.json",
  "formatters_by_ext": {
    ".ts": ["prettier"],
    ".py": ["isort", "black"],
    "Dockerfile": []
  },
  "linters_by_ext": {
    ".ts": ["eslint"],
    ".py": ["ruff"],
    "Dockerfile": ["hadolint"]
  },
  "formatters": {
    "prettier": {
      "args": ["--write", "--single-quote"],
      "markers": ["package.json", ".prettierrc"]
    }
  },
  "linters": {
    "eslint": {
      "cmd": "eslint_d"
    },
    "my-linter": {
      "cmd": "my-linter",
      "args": ["--json"],
      "markers": ["my-linter.json"],
      "require_markers": true,
      "env": {
        "MY_LINTER_MODE": "strict"
      }
    }
  }
}
```

The remaining examples omit `"$schema"` for brevity.

### `formatters_by_ext`

Maps an extension or basename to an ordered list of formatter names.

- Order matters.
- An omitted extension means no formatter runs.
- An empty list means the extension is explicitly disabled.
- Basenames like `Dockerfile` are supported.

### `linters_by_ext`

Maps an extension or basename to an ordered list of linter names.

- Order matters.
- An omitted extension means no linter runs.
- An empty list means the extension is explicitly disabled.

### `formatters` and `linters`

Per-tool definitions merged on top of built-in defaults.

If a tool name is not built in, the override becomes the full definition. This makes custom tools first-class.

### Tool Definition Fields

| Field             | Type                     | Meaning                                                                           |
| ----------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `cmd`             | `string`                 | Override the executable name or path. Defaults to the tool name.                  |
| `args`            | `string[]`               | Full argument list passed before the file path. Replaces built-in args entirely.  |
| `markers`         | `string[]`               | Files used to find the nearest working directory for the tool.                    |
| `require_markers` | `boolean`                | If `true`, skip the tool when no marker is found.                                 |
| `env`             | `Record<string, string>` | Environment variables passed to the tool process.                                 |
| `append_path`     | `boolean`                | If `false`, do not append the edited file path automatically. Defaults to `true`. |

### Marker Resolution

For each file and tool, the plugin walks upward from the edited file and looks for the nearest directory containing one of that tool's `markers`.

- If a marker is found, the tool runs in that directory.
- If no marker is found and `require_markers` is `false`, the tool runs in the plugin `directory`.
- If no marker is found and `require_markers` is `true`, the tool is skipped.

### Local Binary Resolution

For bare commands, the plugin prefers `cwd/node_modules/.bin/<tool>` over `$PATH`.

That means `eslint`, `prettier`, and similar JavaScript tools automatically prefer project-local versions when available.

## Built-In Registry

The registry provides defaults for tool args, marker files, and marker requirements. Built-ins do not auto-enable themselves. You still need to map extensions in `formatters_by_ext` and `linters_by_ext`.

### Formatters

| Name                 | Extensions                                                                     | Default args     | Markers                                                                                                                                                                                                                    | `require_markers` |
| -------------------- | ------------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `prettier`           | `.js`, `.ts`, `.jsx`, `.tsx`, `.css`, `.html`, `.json`, `.md`, `.yaml`, `.yml` | `--write`        | `.prettierrc`, `.prettierrc.json`, `.prettierrc.js`, `.prettierrc.cjs`, `.prettierrc.mjs`, `.prettierrc.yaml`, `.prettierrc.yml`, `prettier.config.js`, `prettier.config.cjs`, `prettier.config.mjs`, `prettier.config.ts` | `false`           |
| `biome`              | `.js`, `.ts`, `.jsx`, `.tsx`, `.json`                                          | `format --write` | `biome.json`, `biome.jsonc`                                                                                                                                                                                                | `true`            |
| `black`              | `.py`                                                                          | none             | `pyproject.toml`, `setup.cfg`, `.black`                                                                                                                                                                                    | `false`           |
| `clang-format`       | `.c`, `.cc`, `.cpp`, `.cxx`, `.h`, `.hh`, `.hpp`, `.hxx`, `.m`, `.mm`          | `-i`             | `.clang-format`, `_clang-format`                                                                                                                                                                                           | `false`           |
| `gofmt`              | `.go`                                                                          | `-w`             | `go.mod`                                                                                                                                                                                                                   | `false`           |
| `goimports`          | `.go`                                                                          | none             | `go.mod`                                                                                                                                                                                                                   | `false`           |
| `google-java-format` | `.java`                                                                        | `-i`             | none                                                                                                                                                                                                                       | `false`           |
| `isort`              | `.py`                                                                          | none             | `pyproject.toml`, `setup.cfg`, `.isort.cfg`                                                                                                                                                                                | `false`           |
| `ktlint`             | `.kt`, `.kts`                                                                  | `-F`             | `ktlint.json`, `.editorconfig`                                                                                                                                                                                             | `false`           |
| `phpcbf`             | `.php`, `.phtml`                                                               | none             | `phpcs.xml`, `phpcs.xml.dist`, `.phpcs.xml`, `.phpcs.xml.dist`, `composer.json`                                                                                                                                            | `false`           |
| `rustfmt`            | `.rs`                                                                          | none             | `Cargo.toml`                                                                                                                                                                                                               | `false`           |
| `scalafmt`           | `.scala`, `.sc`                                                                | none             | `.scalafmt.conf`, `build.sbt`                                                                                                                                                                                              | `false`           |
| `shfmt`              | `.sh`                                                                          | `-w`             | none                                                                                                                                                                                                                       | `false`           |
| `sqlfluff`           | `.sql`                                                                         | `fix --force`    | `.sqlfluff`, `pyproject.toml`                                                                                                                                                                                              | `false`           |
| `stylua`             | `.lua`                                                                         | none             | `.stylua.toml`, `stylua.toml`                                                                                                                                                                                              | `false`           |
| `terraform`          | `.tf`, `.tfvars`                                                               | `fmt`            | none                                                                                                                                                                                                                       | `false`           |
| `tofu`               | `.tf`, `.tfvars`                                                               | `fmt`            | none                                                                                                                                                                                                                       | `false`           |

### Linters

| Name            | Extensions                                               | Default args                          | Markers                                                                                                | `require_markers` |
| --------------- | -------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------- |
| `biome`         | `.js`, `.ts`, `.jsx`, `.tsx`, `.json`                    | `check`                               | `biome.json`, `biome.jsonc`                                                                            | `true`            |
| `clippy`        | `.rs`                                                    | `cargo clippy --message-format short` | `Cargo.toml`                                                                                           | `true`            |
| `cpplint`       | `.c`, `.cc`, `.cpp`, `.cxx`, `.h`, `.hh`, `.hpp`, `.hxx` | none                                  | none                                                                                                   | `false`           |
| `eslint`        | `.js`, `.ts`, `.jsx`, `.tsx`                             | `--format json`                       | `.eslintrc`, `.eslintrc.json`, `.eslintrc.js`, `.eslintrc.cjs`, `eslint.config.js`, `eslint.config.ts` | `true`            |
| `golangci-lint` | `.go`                                                    | `run --out-format json`               | `go.mod`, `.golangci.yml`, `.golangci.yaml`                                                            | `false`           |
| `hadolint`      | `Dockerfile`                                             | `-f json`                             | none                                                                                                   | `false`           |
| `htmlhint`      | `.html`, `.htm`                                          | none                                  | `.htmlhintrc`, `.htmlhintrc.json`, `.htmlhintrc.js`, `htmlhint.config.js`                              | `false`           |
| `ktlint`        | `.kt`, `.kts`                                            | none                                  | `ktlint.json`, `.editorconfig`                                                                         | `false`           |
| `markdownlint`  | `.md`                                                    | none                                  | `.markdownlint.json`, `.markdownlint.yaml`, `.markdownlintrc`                                          | `false`           |
| `phpcs`         | `.php`, `.phtml`                                         | none                                  | `phpcs.xml`, `phpcs.xml.dist`, `.phpcs.xml`, `.phpcs.xml.dist`, `composer.json`                        | `false`           |
| `rubocop`       | `.rb`, `.rake`, `.gemspec`, `Gemfile`, `Rakefile`        | `--format simple`                     | `.rubocop.yml`, `Gemfile`                                                                              | `false`           |
| `ruff`          | `.py`                                                    | `check --output-format json`          | `pyproject.toml`, `ruff.toml`, `.ruff.toml`                                                            | `false`           |
| `shellcheck`    | `.sh`                                                    | `--format json`                       | none                                                                                                   | `false`           |
| `sqlfluff`      | `.sql`                                                   | `lint`                                | `.sqlfluff`, `pyproject.toml`                                                                          | `false`           |
| `yamllint`      | `.yaml`, `.yml`                                          | `-f parsable`                         | `.yamllint`, `.yamllint.yml`, `.yamllint.yaml`                                                         | `false`           |

## Examples

### JavaScript Or TypeScript With Prettier And ESLint

```json
{
  "formatters_by_ext": {
    ".js": ["prettier"],
    ".jsx": ["prettier"],
    ".ts": ["prettier"],
    ".tsx": ["prettier"]
  },
  "linters_by_ext": {
    ".js": ["eslint"],
    ".jsx": ["eslint"],
    ".ts": ["eslint"],
    ".tsx": ["eslint"]
  }
}
```

### JavaScript Or TypeScript With Biome Only

```json
{
  "formatters_by_ext": {
    ".js": ["biome"],
    ".jsx": ["biome"],
    ".ts": ["biome"],
    ".tsx": ["biome"],
    ".json": ["biome"]
  },
  "linters_by_ext": {
    ".js": ["biome"],
    ".jsx": ["biome"],
    ".ts": ["biome"],
    ".tsx": ["biome"],
    ".json": ["biome"]
  }
}
```

### Python With `isort`, `black`, And `ruff`

```json
{
  "formatters_by_ext": {
    ".py": ["isort", "black"]
  },
  "linters_by_ext": {
    ".py": ["ruff"]
  }
}
```

### Go

```json
{
  "formatters_by_ext": {
    ".go": ["gofmt"]
  },
  "linters_by_ext": {
    ".go": ["golangci-lint"]
  }
}
```

### Shell Scripts

```json
{
  "formatters_by_ext": {
    ".sh": ["shfmt"]
  },
  "linters_by_ext": {
    ".sh": ["shellcheck"]
  }
}
```

### Markdown And Dockerfiles

```json
{
  "formatters_by_ext": {
    ".md": ["prettier"]
  },
  "linters_by_ext": {
    ".md": ["markdownlint"],
    "Dockerfile": ["hadolint"]
  }
}
```

### Override A Built-In Tool

This replaces Prettier's default args and adds a broader root marker set:

```json
{
  "formatters_by_ext": {
    ".ts": ["prettier"]
  },
  "formatters": {
    "prettier": {
      "args": ["--write", "--single-quote"],
      "markers": ["package.json", ".prettierrc", "prettier.config.ts"]
    }
  }
}
```

### Use A Different Executable For A Built-In Tool

```json
{
  "linters_by_ext": {
    ".js": ["eslint"]
  },
  "linters": {
    "eslint": {
      "cmd": "eslint_d"
    }
  }
}
```

### Add A Brand-New Tool

Unknown names are valid. Define the tool and then reference it from an extension map:

```json
{
  "linters_by_ext": {
    ".yaml": ["yamllint"]
  },
  "linters": {
    "yamllint": {
      "cmd": "yamllint",
      "args": ["-f", "parsable"],
      "markers": [".yamllint", ".yamllint.yml", ".yamllint.yaml"],
      "require_markers": false
    }
  }
}
```

### Monorepo Marker Resolution

If an edited file lives in `apps/web/src/app.tsx` and both `/repo/package.json` and `/repo/apps/web/package.json` exist, tool execution uses the nearest matching marker directory.

That means a tool can automatically run inside `apps/web` instead of the repository root when the nested directory contains the relevant marker.

## Custom Tools And Overrides

The customization model is intentionally small.

- Use `formatters_by_ext` and `linters_by_ext` to choose which tools run.
- Use `formatters.<name>` and `linters.<name>` to override built-in behavior.
- Use a brand-new name to define a completely custom tool.

Important override rule:

- `args` replaces the built-in args. It does not append to them.

Important execution rule:

- the file path is always appended automatically after `args`

Important root rule:

- `markers` only control cwd resolution, not whether the extension is enabled

## Troubleshooting

### The Plugin Loaded But Nothing Runs

Check these first:

- The file extension is present in `formatters_by_ext` or `linters_by_ext`.
- The file was changed by `edit`, `write`, or `apply_patch`, not `bash`.
- The session actually reached `session.idle`.

### My Tool Is Configured But Still Does Not Run

Common causes:

- `require_markers` is `true` and no marker file was found.
- The configured executable is not installed.
- The extension key is wrong. Use `.ts` for `file.ts`, but `Dockerfile` for a basename-only file.

### My User Config Is Ignored

The loader uses the first valid config file it finds:

1. project `.opencode/codefmt.json`
2. user `~/.config/opencode/codefmt.json`

If the project config exists and is valid, the user config is not loaded.

If neither config exists yet, the plugin writes the default user config with a version-pinned `"$schema"` URL.

### My Args Did Not Get Added

`args` replaces the default tool args. If you override `args`, include the full list you want.

### Why Did ESLint Or Prettier Use A Different Version Than My Shell?

The plugin prefers `node_modules/.bin/<tool>` in the resolved cwd before `$PATH`.

That means project-local JavaScript tooling wins automatically.

### Formatter Failures Do Not Show Up In The Session

Current behavior:

- formatter failures are logged
- linter failures are injected back into the session

## Security

Like `nvim-lint`, this plugin may prefer project-local executables over global ones. For JavaScript tools, `node_modules/.bin/<tool>` in the resolved cwd takes precedence over `$PATH`.

That is the right default for normal development, but it means you should avoid enabling this plugin in untrusted repositories unless you are comfortable executing the repository's local formatter and linter binaries.

## Contributing

Registry contributions are encouraged.

- Missing tool support is usually a small addition under `src/registry/`.
- Tool behavior should stay explicit and minimal.
- If you add or remove a built-in tool, update both `src/registry/<tool>.ts` and `src/registry/index.ts`.

Contributor workflow lives in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Development

Runtime is Bun.

Install dependencies:

```bash
bun install
```

Main verification commands:

```bash
bun run format:check
bun run lint
bun run test
bun run build
```

Focused tests:

```bash
bunx vitest run src/__tests__/runner.test.ts
bunx vitest run src/__tests__/runner.test.ts -t "prefers a local node_modules binary when present"
```

Notes for contributors:

- `dist/` is the publish artifact built from `src/index.ts`
- do not hand-edit `dist/`
- changesets are used for releases
- run `bun run changeset` for user-facing changes that should ship
