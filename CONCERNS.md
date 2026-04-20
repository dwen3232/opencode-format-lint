# Plugin Concerns

- [ ] Roll child-session file tracking up to the parent session ID so child edits are formatted and linted when the parent session goes idle. Current behavior tracks by child session and suppresses child idle handling.
- [ ] Ensure child-session tracking does not leave stale entries in `pendingBySession`.
- [ ] Change runner fallback cwd from `process.cwd()` to the plugin `directory` when no marker is found and `require_markers` is `false`.
- [ ] Delete pending session entries only after successful processing, or restore them if formatting/linting throws.
- [ ] Fail closed on `client.session.get()` errors instead of assuming the session is a parent session.
- [ ] Surface formatter failures even when the formatter exits non-zero with empty `stderr` but stdout output or only an exit code.
- [ ] Revisit the global `logger` and `shell` singletons if multiple plugin instances or workspaces can share a process.
