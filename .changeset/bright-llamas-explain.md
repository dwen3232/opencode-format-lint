---
"opencode-format-lint": minor
---

Publish the `codefmt.json` JSON Schema as `codefmt.schema.json` and expose it from the package.

When no config exists, create a default user config with a version-pinned `$schema` URL so editors can validate and autocomplete `codefmt.json` files.
