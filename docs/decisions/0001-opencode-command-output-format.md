# ADR 0001: OpenCode commands written as `.md` files, not in `opencode.json`

## Status
Accepted

## Date
2026-02-20

## Context
OpenCode supports two equivalent formats for defining custom commands: entries
in the `command` key of `opencode.json`, and `.md` files in the `commands/` directory.
Writing to `opencode.json` requires overwriting or merging the user's config file, which
is risky. Writing `.md` files is additive and non-destructive.

## Decision
The OpenCode target always emits commands as individual `.md` files in the
`commands/` subdirectory. The `command` key is never written to `opencode.json` by this
tool.

## Consequences
- Positive: Installs are non-destructive to user's `opencode.json`. Commands are visible as
  individual files, easy to inspect and customize. Consistent with how agents and skills are
  already handled (as `.md` files).
- Negative: Users who inspect `opencode.json` will not see plugin commands there; they must
  look in the `commands/` directory.
- Neutral: The `.md` command format requires OpenCode >= the version that introduced
  command file support (confirmed stable in current docs).

## Plan Reference
Originated from: `docs/plans/feature_opencode-commands-as-md-files.md`
