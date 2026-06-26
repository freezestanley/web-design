# Publish Project Zip Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the current Step 4 publish flow so source packaging emits `project.zip` and dist packaging emits `dist.zip`, with metadata written back to `.webdesign/project.json`.

**Architecture:** Keep `scripts/publish.js` as the sole publish entrypoint and reuse the existing zip helper abstraction. Change only the helper output names and source zip inclusion rules, then verify the current publish metadata and marker output against the new artifact names.

**Tech Stack:** Node.js, CommonJS scripts, system `zip`, Node.js test runner

---

### Task 1: Lock the new publish artifact contract in tests

**Files:**
- Modify: `scripts/publish.test.js`
- Test: `scripts/publish.test.js`

**Step 1: Write the failing test**

Add assertions for:
- publish marker references `/project.zip` and `/dist.zip`
- `.webdesign/project.json.sourceZipPath` ends with `project.zip`
- `.webdesign/project.json.distZipPath` ends with `dist.zip`
- `project.zip` contains project files but excludes `node_modules`
- `dist.zip` contains `dist/` and `dist-single/`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/publish.test.js`
Expected: FAIL because current publish still emits project-name-based zip names.

**Step 3: Update the tests only enough to describe the new behavior**

Keep the existing build-gate and failure-path expectations unchanged.

**Step 4: Run test to verify it fails for the right reason**

Run: `node --test scripts/publish.test.js`
Expected: FAIL on artifact name or zip-content assertions.

### Task 2: Implement the minimal publish zip change

**Files:**
- Modify: `scripts/lib/zip.js`
- Modify: `scripts/publish.js`
- Test: `scripts/publish.test.js`

**Step 1: Write the minimal implementation**

Change the publish helpers to:
- output `project.zip`
- output `dist.zip`
- exclude `node_modules` and `.zip` files from `project.zip`
- keep `dist.zip` limited to `dist/` and `dist-single/`

Keep publish metadata writes targeting `.webdesign/project.json`.

**Step 2: Run test to verify it passes**

Run: `node --test scripts/publish.test.js`
Expected: PASS

### Task 3: Run focused publish regressions

**Files:**
- Reuse: `scripts/publish.test.js`
- Reuse: `scripts/init-project.test.js`
- Reuse: `scripts/scaffold-template.test.js`

**Step 1: Run regression tests**

Run: `node --test scripts/publish.test.js scripts/init-project.test.js scripts/scaffold-template.test.js`
Expected: PASS

**Step 2: Inspect for regressions**

Confirm:
- publish still requires `G9_PUBLISH_READY`
- publish still requires `dist/` and `dist-single/`
- scaffold and init-project assumptions remain unchanged

