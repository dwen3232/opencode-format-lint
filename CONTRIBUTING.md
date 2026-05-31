# Contributing

This project is small on purpose. The best contributions keep it that way.

## Local Development

Runtime is Bun.

Install dependencies:

```bash
bun install
```

Run the full verification sweep after source changes:

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

## Project Structure

- `src/index.ts`: plugin entrypoint, file tracking, root-session aggregation, idle handling
- `src/config.ts`: config loading and runtime tool resolution
- `src/processor.ts`: formatter-first, then linter execution over tracked files
- `src/runner.ts`: marker lookup, cwd resolution, command selection, process execution
- `src/registry/*.ts`: built-in tool defaults by formatter or linter
- `src/registry/index.ts`: aggregate built-in tool maps used during config resolution
- `src/__tests__/*.test.ts`: behavior tests

## Design Constraints

Keep these behaviors intact unless the change explicitly intends to alter them:

- Only `edit`, `write`, and `apply_patch` are tracked.
- Bash-driven file mutations are intentionally not tracked.
- Edited files are deduplicated per root session ID.
- Child-session edits roll up to the root session.
- Work only runs after the root session emits `session.idle`.
- Formatters always run before linters.
- Tool cwd comes from the nearest ancestor matching one of the tool's markers.
- If no marker is found and `require_markers` is `false`, the tool falls back to the plugin directory.
- Bare commands prefer `cwd/node_modules/.bin/<tool>` over `$PATH`.

## Adding Or Updating A Registry Entry

Registry changes should be small and explicit.

1. Add or update the tool file in `src/registry/`.
2. Export its defaults through `src/registry/index.ts`.
3. Add or update tests if behavior changed.
4. Update `README.md` if supported built-ins or defaults changed.

Each registry file returns a `RegistryEntry` with one or both of these keys:

- `formatter`
- `linter`

Each entry defines:

- `extensions`
- `def.args`
- `def.markers`
- `def.require_markers`
- optional `def.cmd`
- optional `def.env`
- optional `def.append_path`

Example formatter entry:

```ts
import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".ext"],
    def: {
      args: ["--write"],
      markers: ["tool.config.json"],
      require_markers: false,
    },
  },
};

export default entry;
```

## Registry Guidelines

Prefer defaults that are predictable across projects.

- Use the real CLI name as the tool name unless there is a strong reason not to.
- Keep args minimal.
- Only require markers when the tool should not run outside a configured project.
- Prefer marker sets that reflect how the tool is commonly configured.
- Do not auto-enable extensions from the registry. Extension activation stays in user config.
- Do not add compatibility layers for tools that are not already needed.

If you add or remove a built-in tool, update both the registry source and the README's built-in registry tables.

## Testing Expectations

Add or update tests when changing:

- config loading or merge behavior
- marker resolution
- cwd fallback behavior
- local binary resolution
- root-session tracking
- retry behavior
- formatter or linter error normalization

Relevant test files:

- `src/__tests__/config.test.ts`
- `src/__tests__/runner.test.ts`
- `src/__tests__/index.test.ts`
- `src/__tests__/processor.test.ts`

## Documentation Expectations

User-visible behavior belongs in `README.md`.

Add or update docs when changing:

- built-in registry entries
- config semantics
- installation or setup flow
- troubleshooting or security guidance

## Releases

Changesets manages versioning and publishing.

Run this for user-facing changes that should ship:

```bash
bun run changeset
```

The publish workflow runs formatting, linting, tests, and build before publishing from the default branch.

## Good First Contributions

- add a missing formatter or linter to `src/registry/`
- improve marker defaults for an existing tool
- add docs examples for a common language stack
- tighten tests around session tracking or cwd resolution

## Before Opening A PR

Check all of these:

- source changes are formatted
- lint passes
- tests pass
- build passes
- README stays accurate
- registry additions are wired through `src/registry/index.ts`
- a changeset is added if the change is user-facing
