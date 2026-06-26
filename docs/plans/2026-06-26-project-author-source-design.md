# Project Author Source Design

**Goal:** Make `project.json.author` the durable source of truth for publish authoring, while still repairing missing author values from the current conversation session when necessary.

**Scope:** This change is limited to project initialization, publish-time author resolution, tests, and the corresponding SOP wording in `SKILL.md`. It must not alter the publish marker shape or the session key parsing format.

## Objectives

- Continue deriving author from the current conversation session key format.
- Write `project.json.author` during project creation.
- Treat `project.json.author` as the preferred source during publish.
- If `project.json.author` is empty at publish time, derive author from the current conversation session and write it back to `project.json.author`.
- Keep publish marker `author` aligned with the final `project.json.author` value.
- Leave author empty only when both project metadata and current conversation session fail to produce a `userAccount`.

## Chosen Approach

Keep session parsing in one shared helper and add publish-time author resolution that prefers project metadata over the current environment.

Why this approach:

- It preserves the current session parsing contract instead of duplicating that logic in `publish.js`.
- It makes project author stable after initialization, which matches the project-level nature of the metadata.
- It still repairs older or incomplete projects without requiring manual metadata edits.
- It keeps the publish marker consistent with the project metadata that downstream systems can inspect later.

## Author Resolution Rules

### Project Creation

When `scripts/init-project.js` creates `.webdesign/project.json`:

- derive author from the current conversation session key
- write the resolved `userAccount` into `project.json.author`

### Publish

When `scripts/publish.js` runs:

1. read `.webdesign/project.json`
2. if `project.json.author` is non-empty:
   - use it directly
3. else:
   - derive author from the current conversation session key
   - if non-empty, write it back to `project.json.author`
   - use that repaired value for the publish marker
4. if still empty:
   - keep author empty in both metadata and publish marker

## Files To Change

- `scripts/init-project.js`
- `scripts/publish.js`
- `scripts/lib/session-author.js`
- `scripts/init-project.test.js`
- `scripts/publish.test.js`
- `scripts/skill-contract.test.js`
- `SKILL.md`

## Test Strategy

Update tests to prove:

- init-project still writes author from the current session
- publish uses existing `project.json.author` even if the current session differs
- publish backfills empty `project.json.author` from the current session and persists it
- publish leaves author empty only when no source is available

## Risks And Mitigations

Risk: publish could accidentally overwrite a valid historical author with the current session.
Mitigation: prefer non-empty `project.json.author` and only backfill when empty.

Risk: tests may only validate marker output and miss metadata persistence.
Mitigation: assert both publish marker author and the updated `project.json.author` value.

