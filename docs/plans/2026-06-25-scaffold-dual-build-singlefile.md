# Scaffold Dual Build Singlefile Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the scaffold so `npm run build` produces both the normal `dist/` app build and a separate single-file HTML artifact.

**Architecture:** Keep the existing `vite.config.js` as the source of truth for the standard Vite build and `dist.zip` generation. Add a second Vite config dedicated to `vite-plugin-singlefile`, and chain both builds from the scaffold `build` script so output directories stay isolated and the publish workflow remains compatible.

**Tech Stack:** Vite 5, React 18, `@adjfut/vite-plugin-zip-pack`, `vite-plugin-singlefile`, Node.js test runner

---

### Task 1: Lock the new scaffold contract in tests

**Files:**
- Modify: `scripts/scaffold-template.test.js`
- Test: `scripts/scaffold-template.test.js`

**Step 1: Write the failing test**

Add assertions for:
- `vite-plugin-singlefile` exists in scaffold `devDependencies`
- scaffold contains `vite.singlefile.config.js`
- `build` script contains both the normal build and the single-file build
- single-file config imports and uses `vite-plugin-singlefile`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/scaffold-template.test.js`
Expected: FAIL because the scaffold does not yet define the single-file build contract.

**Step 3: Write minimal implementation**

Update the scaffold tests only enough to describe the expected new behavior.

**Step 4: Run test to verify it fails for the right reason**

Run: `node --test scripts/scaffold-template.test.js`
Expected: FAIL with missing dependency, file, or config wiring assertions.

### Task 2: Add the second scaffold build target

**Files:**
- Modify: `templates/scaffold/package.json`
- Add: `templates/scaffold/vite.singlefile.config.js`
- Modify: `templates/scaffold/vite.config.js`
- Test: `scripts/scaffold-template.test.js`

**Step 1: Write the minimal implementation**

Change scaffold files to:
- add `vite-plugin-singlefile` to `devDependencies`
- change `build` to run the normal Vite build and then `vite build --config vite.singlefile.config.js`
- keep `vite.config.js` focused on React and zip-pack
- add `vite.singlefile.config.js` with React + `vite-plugin-singlefile` and `outDir: "dist-single"`

**Step 2: Run test to verify it passes**

Run: `node --test scripts/scaffold-template.test.js`
Expected: PASS

### Task 3: Run the relevant regression tests

**Files:**
- Reuse: `scripts/scaffold-template.test.js`
- Reuse: `scripts/init-project.test.js`
- Reuse: `scripts/publish.test.js`

**Step 1: Run focused regression tests**

Run: `node --test scripts/scaffold-template.test.js scripts/init-project.test.js scripts/publish.test.js`
Expected: PASS

**Step 2: Inspect for workflow regressions**

Confirm:
- scaffold copy still works
- publish flow still only depends on `dist/`
- no test assumptions broke around existing zip output

### Task 4: Document execution result

**Files:**
- Reuse: `docs/plans/2026-06-25-scaffold-dual-build-singlefile-design.md`
- Reuse: `docs/plans/2026-06-25-scaffold-dual-build-singlefile.md`

**Step 1: Summarize the implemented behavior**

Record that:
- `npm run build` now runs two builds
- normal build output remains in `dist/`
- single-file output is emitted to `dist-single/index.html`
- publish logic remains unchanged

**Step 2: Note limitations**

Record that:
- no repo commit was made because this workspace is not attached to a Git repository
- this plan was executed directly in-session rather than via a separate worktree
