# opencode-format-lint

## 0.2.0

### Minor Changes

- 0922dc6: Publish the `codefmt.json` JSON Schema as `codefmt.schema.json` and expose it from the package.

  When no config exists, create a default user config with a version-pinned `$schema` URL so editors can validate and autocomplete `codefmt.json` files.

### Patch Changes

- e14b83b: Do not overwrite an existing user `codefmt.json` with a generated default when the existing config is invalid.

  When all discovered config files are invalid, keep warning and fall back to the built-in empty config instead of rewriting the user-level config file.
