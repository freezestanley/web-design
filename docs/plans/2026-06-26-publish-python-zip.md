# Publish Python Zip Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current Step 4 `zip` command dependency with `python3` standard-library archive creation, while preserving `project.zip`, `dist.zip`, and `.webdesign/project.json` behavior.

**Architecture:** Keep `scripts/publish.js` unchanged at the workflow level and reuse the existing zip helper abstraction. Move archive creation into a `python3`-backed helper path and update tests to verify archive contents without relying on system `zipinfo`.

**Tech Stack:** Node.js, CommonJS scripts, `python3`, Python `zipfile`, Node.js test runner

---

### Task 1: Lock the Python-backed zip contract in tests

**Files:**
- Modify: `scripts/publish.test.js`
- Create: `scripts/zip.test.js`
- Test: `scripts/publish.test.js`
- Test: `scripts/zip.test.js`

**Step 1: Write the failing tests**

Add tests that:
- inspect zip entries via `python3` instead of `zipinfo`
- verify `project.zip` excludes `node_modules` and old `.zip` files
- verify the zip helper still works when `PATH` exposes `python3` but not `zip`

**Step 2: Run tests to verify they fail**

Run: `node --test scripts/publish.test.js scripts/zip.test.js`
Expected: FAIL because the current helper still shells out to `zip`.

**Step 3: Update the tests only enough to describe the new behavior**

Do not change publish metadata or Gate expectations.

**Step 4: Run tests to verify they fail for the right reason**

Run: `node --test scripts/publish.test.js scripts/zip.test.js`
Expected: FAIL on the missing `zip` backend assumption.

### Task 2: Implement the Python-backed zip helper

**Files:**
- Modify: `scripts/lib/zip.js`
- Test: `scripts/publish.test.js`
- Test: `scripts/zip.test.js`

**Step 1: Write the minimal implementation**

Change the helper to:
- call `python3`
- create archives with Python `zipfile`
- preserve current artifact names and inclusion rules
- overwrite existing target archives before writing

**Step 2: Run tests to verify they pass**

Run: `node --test scripts/publish.test.js scripts/zip.test.js`
Expected: PASS

### Task 3: Run focused regressions

**Files:**
- Reuse: `scripts/publish.test.js`
- Reuse: `scripts/zip.test.js`
- Reuse: `scripts/init-project.test.js`
- Reuse: `scripts/scaffold-template.test.js`

**Step 1: Run regression tests**

Run: `node --test scripts/publish.test.js scripts/zip.test.js scripts/init-project.test.js scripts/scaffold-template.test.js`
Expected: PASS

**Step 2: Inspect for regressions**

Confirm:
- Step 4 still requires `G9_PUBLISH_READY`
- `project.zip` and `dist.zip` contracts remain unchanged
- no test still depends on `zip` or `zipinfo`

