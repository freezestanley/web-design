# Publish Dist And Singlefile Design

**Goal:** Update the `web-design` publish step so the generated `dist.zip` contains both `dist/` and `dist-single/`, while preserving the rest of the publish workflow.

**Scope:** This change is limited to publish-time validation, zip packaging, tests, and the corresponding SOP text in `SKILL.md`.

## Objectives

- Keep `node scripts/publish.js <project-path> <task-id>` as the only publish entrypoint.
- Keep the existing publish marker format unchanged.
- Keep `.webdesign/project.json` fields unchanged, including `distZipPath`.
- Require both `dist/` and `dist-single/` to exist after `npm run build`.
- Package both directories into a single `<project>-dist.zip`.

## Chosen Approach

Use the existing `createDistZip()` abstraction and expand it from one entry to two.

Why this approach:

- It changes the publish contract in one place instead of branching logic through `publish.js`.
- It preserves the existing output filename and metadata shape.
- It keeps downstream consumers stable because the zip path and publish marker do not change.

## Publish Behavior

After `npm run build`, `publish.js` will:

1. verify `dist/` exists
2. verify `dist-single/` exists
3. fail immediately if either directory is missing
4. create source zip as before
5. create one `dist.zip` containing both directories

## Files To Change

- `scripts/publish.js`
- `scripts/lib/zip.js`
- `scripts/publish.test.js`
- `SKILL.md`

## Test Strategy

Add or update publish tests to prove:

- successful publish still emits the same marker shape
- the resulting dist zip contains both `dist/` and `dist-single/`
- publish fails when `dist-single/` is missing

## Notes

- This workspace is not attached to a Git repository, so the design is saved locally only.
