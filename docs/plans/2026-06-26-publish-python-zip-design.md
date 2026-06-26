# Publish Python Zip Design

**Goal:** Replace the current Step 4 dependency on the system `zip` command with `python3` standard-library zip creation, while keeping publish artifacts and metadata behavior unchanged.

**Scope:** This change is limited to the existing publish zip helper, publish tests, and any new zip-helper tests needed to verify behavior without a system `zip` command. It must not add a second publish path or change the Step 4 Gate workflow.

## Objectives

- Keep `scripts/publish.js` as the only Step 4 publish entrypoint.
- Preserve current artifact contracts:
  - `project.zip`
  - `dist.zip`
- Preserve current metadata writes to `.webdesign/project.json`.
- Remove runtime dependency on the external `zip` command.
- Depend only on `python3` plus the Python standard library.
- Keep `project.zip` exclusions unchanged:
  - exclude `node_modules`
  - exclude existing `.zip` files, including `dist.zip`
- Keep `dist.zip` contents unchanged:
  - `dist/`
  - `dist-single/`

## Chosen Approach

Keep the JavaScript publish pipeline and swap only the low-level archive creation backend from `zip` to `python3`.

Why this approach:

- It changes the smallest possible surface area in the current Step 4 implementation.
- It preserves the existing publish script API and metadata flow.
- It avoids introducing a JavaScript zip dependency just to replace a missing system binary.
- It gives deterministic behavior on systems that have `python3` but not `zip`.

## Backend Design

`scripts/lib/zip.js` will continue to expose:

- `createSourceZip(projectPath)`
- `createDistZip(projectPath)`

Internally, instead of calling `zip -qr`, the helper will call `python3` with a small inline standard-library script that:

- creates a ZIP archive with `zipfile.ZipFile`
- recursively adds directories
- preserves relative paths inside the archive
- overwrites any existing target archive before writing

## Test Strategy

Add a dedicated zip-helper test that:

- restricts `PATH` so `zip` is unavailable
- exposes only `python3`
- verifies `createSourceZip()` and `createDistZip()` still succeed

Update publish tests to inspect zip contents through `python3` instead of `zipinfo`, so tests also stay valid on systems without `zipinfo`.

## Files To Change

- `scripts/lib/zip.js`
- `scripts/publish.test.js`
- `scripts/zip.test.js`

## Risks And Mitigations

Risk: inline Python could become hard to maintain if it grows.
Mitigation: keep the script minimal and narrowly scoped to current archive behavior.

Risk: archive entry paths could differ from the old `zip` command output.
Mitigation: verify expected entry names directly in tests for both source and dist artifacts.

Risk: some systems may expose `python` but not `python3`.
Mitigation: use `python3` explicitly because that is the confirmed environment constraint for this change.

