# Publish Dist And Singlefile Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make publish require both `dist/` and `dist-single/` and package them together into one `dist.zip`.

**Architecture:** Keep the publish entrypoint, metadata fields, and publish marker unchanged. Extend the zip helper to package both output directories into the same archive, and tighten publish validation so missing `dist-single/` fails the release.

**Tech Stack:** Node.js, CommonJS scripts, `zip` CLI, Node test runner

---

### Task 1: Lock the publish behavior in tests

**Files:**
- Modify: `scripts/publish.test.js`
- Test: `scripts/publish.test.js`

**Step 1: Write the failing test**

Add coverage for:
- successful publish creates `dist.zip` that contains both `dist/` and `dist-single/`
- publish fails if `dist-single/` is missing after build

**Step 2: Run test to verify it fails**

Run: `node --test scripts/publish.test.js`
Expected: FAIL because current publish only requires `dist/` and only zips that directory.

### Task 2: Implement the minimal publish change

**Files:**
- Modify: `scripts/lib/zip.js`
- Modify: `scripts/publish.js`
- Modify: `SKILL.md`
- Test: `scripts/publish.test.js`

**Step 1: Write the minimal implementation**

Update:
- `createDistZip(projectPath)` to archive both `dist` and `dist-single`
- `publish.js` to fail when either directory is missing
- `SKILL.md` Step 4 to describe the new archive contents

**Step 2: Run test to verify it passes**

Run: `node --test scripts/publish.test.js`
Expected: PASS

### Task 3: Run focused regressions

**Files:**
- Reuse: `scripts/publish.test.js`
- Reuse: `scripts/scaffold-template.test.js`
- Reuse: `scripts/init-project.test.js`

**Step 1: Run focused regression tests**

Run: `node --test scripts/publish.test.js scripts/scaffold-template.test.js scripts/init-project.test.js`
Expected: PASS

**Step 2: Confirm no workflow drift**

Verify:
- scaffold build contract remains unchanged
- init project behavior remains unchanged
- publish marker and project metadata shape remain unchanged
