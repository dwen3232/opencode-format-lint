# opencode-format-lint

## Commands

- Runtime is Bun, not npm. Use `bun run build`, `bun run test`, `bun run lint`, `bun run lint:fix`, `bun run format`, and `bun run format:check`.
- Focused Vitest runs: `bunx vitest run src/__tests__/runner.test.ts` and `bunx vitest run src/__tests__/runner.test.ts -t "prefers a local node_modules binary when present"`.
- `dist/` is the publish artifact and is built from `src/index.ts` via `bun build src/index.ts --outdir dist --target bun`. Do not hand-edit `dist/`.

## Structure

- Single-package TypeScript plugin. Main entrypoint is `src/index.ts`; package exports only `dist/`.
- Execution flow is split across `src/index.ts` (OpenCode hooks and session tracking), `src/config.ts` (load/merge `codefmt.json`), `src/processor.ts` (format then lint edited files), `src/runner.ts` (marker lookup, cwd resolution, shell execution), and `src/registry/*.ts` (built-in tool defaults by language).
- If you add or remove a built-in tool, update both its file under `src/registry/` and the aggregate maps in `src/registry/index.ts`.

## Behavior That Is Easy To Miss

- The plugin only tracks edits reported through OpenCode `edit`, `write`, and `apply_patch`. File mutations done through `bash` are invisible to the plugin's tracking.
- Edited files are deduplicated per root session ID. Child-session edits roll up to the root session and only run after that root session emits `session.idle`.
- On idle, the plugin always runs formatters before linters. Lint failures are injected back into the session with `client.session.prompt`.
- Tool cwd is the nearest ancestor containing one of the tool's configured `markers`; if none is found and `require_markers` is `false`, execution falls back to the plugin `directory`; if `true`, the tool is skipped.
- Bare commands prefer `cwd/node_modules/.bin/<tool>` before `$PATH`. Local project binaries win automatically.

## Config

- Runtime config file name is `codefmt.json`.
- Load order is project-local `.opencode/codefmt.json`, then user-level `~/.config/opencode/codefmt.json`. The first valid file wins.
- `formatters_by_ext` and `linters_by_ext` replace the default tool list for that extension entirely.
- `formatters` and `linters` merge per-tool overrides on top of built-in defaults.
- Config parsing uses Zod and strips unknown keys.

## Verification

- Preferred full sweep after source changes: `bun run format:check`, `bun run lint`, `bun run test`, `bun run build`.
- `src/__tests__/index.test.ts` covers session tracking and idle behavior. `src/__tests__/runner.test.ts` covers marker lookup, cwd fallback, error normalization, and local binary resolution.
- `CONCERNS.md` tracks known edge cases around child sessions, fallback cwd, retry behavior, and formatter error surfacing. Check it before touching `src/index.ts` or `src/runner.ts`.
