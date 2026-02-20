# ADR 0002: Plugin merges into existing `opencode.json` rather than replacing it

## Status
Accepted

## Date
2026-02-20

## Context
Users have existing `opencode.json` files with personal configuration (API
keys, model preferences, themes). The install command previously backed up and replaced
this file entirely, destroying user settings.

## Decision
`writeOpenCodeBundle` reads the existing `opencode.json` (if present),
deep-merges plugin-provided keys (MCP servers, permission, tools) without overwriting
user-set values, and writes the merged result. User keys always win on conflict.

## Consequences
- Positive: User config is preserved across installs. Re-installs are idempotent for
  user-set values. No more need for backup/restore workflow.
- Negative: If a plugin needs to _remove_ or _update_ an MCP server entry, it cannot do
  so (user's entry wins). This is acceptable -- the user is in control of their config.
- Neutral: The backup-before-overwrite behavior is retained (backup of the pre-merge file
  still created for safety). The `backupFile` call now backs up before merge rather than
  before full replacement.

## Plan Reference
Originated from: `docs/plans/feature_opencode-commands-as-md-files.md`
