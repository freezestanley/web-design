# Publish Project Zip Design

**Goal:** Update the existing Step 4 publish flow so source packaging emits a fixed `project.zip`, while `dist.zip` continues to package only `dist/` and `dist-single/`.

**Scope:** This change is limited to the current publish implementation, publish tests, and publish-time zip helper behavior. It must not introduce a second publish path or alter the Gate transition model.

## Objectives

- Keep `scripts/publish.js` as the only Step 4 publish entrypoint.
- Keep the build prerequisite unchanged: publish still runs `npm run build`.
- Emit a fixed source artifact named `project.zip`.
- Package the whole project into `project.zip`, excluding `node_modules` and existing zip artifacts.
- Emit a fixed dist artifact named `dist.zip`.
- Keep `dist.zip` limited to `dist/` and `dist-single/`.
- Write `project.zip` to `.webdesign/project.json.sourceZipPath`.
- Write `dist.zip` to `.webdesign/project.json.distZipPath`.
- Keep the publish marker shape unchanged, with only the artifact paths changing.

## Chosen Approach

Keep the existing publish pipeline and narrow the change to artifact naming plus zip entry selection.

Why this approach:

- It preserves the current Step 4 workflow contract and only changes the artifact outputs.
- It avoids unnecessary branching in `publish.js`.
- It keeps artifact responsibility split cleanly:
  - `project.zip` is the complete project snapshot
  - `dist.zip` is the deployable build artifact
- It is easy to verify through existing publish tests.

## Packaging Design

### Source Artifact

`createSourceZip(projectPath)` will produce:

- output path: `<projectPath>/project.zip`
- contents: all top-level project entries except:
  - `node_modules`
  - any existing `.zip` files

This keeps the project artifact complete enough for handoff while avoiding dependency bloat and recursive zip inclusion.

### Dist Artifact

`createDistZip(projectPath)` will produce:

- output path: `<projectPath>/dist.zip`
- contents:
  - `dist/`
  - `dist-single/`

This keeps the deployable artifact aligned to the Vite build outputs already required by publish.

## Files To Change

- `scripts/lib/zip.js`
- `scripts/publish.js`
- `scripts/publish.test.js`

## Test Strategy

Update publish tests to prove:

- publish marker now references `project.zip` and `dist.zip`
- `.webdesign/project.json` stores those exact absolute paths
- `project.zip` excludes `node_modules`
- `dist.zip` still includes both `dist/` and `dist-single/`
- publish still fails when `dist-single/` is missing

## Risks And Mitigations

Risk: renaming artifacts could break downstream consumers expecting project-name-based zip names.
Mitigation: lock the new fixed names in tests and metadata assertions.

Risk: full-project zipping could accidentally include dependency trees or prior artifacts.
Mitigation: explicitly filter out `node_modules` and `.zip` files before invoking `zip`.

Risk: changing helper behavior could unintentionally affect dist packaging.
Mitigation: keep `createDistZip()` isolated and verify its contents through `zipinfo`.

