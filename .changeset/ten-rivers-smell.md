---
"opencode-format-lint": patch
---

Do not overwrite an existing user `codefmt.json` with a generated default when the existing config is invalid.

When all discovered config files are invalid, keep warning and fall back to the built-in empty config instead of rewriting the user-level config file.
