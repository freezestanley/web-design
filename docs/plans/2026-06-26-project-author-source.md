# Project Author Source Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `.webdesign/project.json.author` the preferred publish author source, with publish-time backfill from the current conversation session only when the project metadata is empty.

**Architecture:** Reuse the existing session parsing helper as the only parser for `SESSION_KEY` / `SESSION`. Add a small author-resolution step in `publish.js` that prefers existing project metadata, conditionally repairs empty metadata from the current session, and uses the resolved value consistently for both metadata writes and the publish marker.

**Tech Stack:** Node.js, CommonJS scripts, JSON project metadata, Node.js test runner

---

### Task 1: Lock the new author contract in tests

**Files:**
- Modify: `scripts/init-project.test.js`
- Modify: `scripts/publish.test.js`
- Modify: `scripts/skill-contract.test.js`
- Test: `scripts/init-project.test.js`
- Test: `scripts/publish.test.js`

**Step 1: Write the failing tests**

Add assertions for:
- init-project still writes author from the current session
- publish prefers existing `project.json.author` over the current session
- publish backfills empty `project.json.author` from the current session and persists it
- publish leaves author empty only when neither source exists

**Step 2: Run tests to verify they fail**

Run: `node --test scripts/init-project.test.js scripts/publish.test.js scripts/skill-contract.test.js`
Expected: FAIL because publish currently always uses the current session and does not repair `project.json.author`.

**Step 3: Update the tests only enough to describe the new behavior**

Do not change the publish marker shape or artifact expectations.

**Step 4: Run tests to verify they fail for the right reason**

Run: `node --test scripts/init-project.test.js scripts/publish.test.js scripts/skill-contract.test.js`
Expected: FAIL on author selection or metadata persistence assertions.

### Task 2: Implement shared author resolution

**Files:**
- Modify: `scripts/lib/session-author.js`
- Modify: `scripts/publish.js`
- Modify: `scripts/init-project.js`
- Test: `scripts/init-project.test.js`
- Test: `scripts/publish.test.js`

**Step 1: Write the minimal implementation**

Implement:
- a helper that resolves author from current session
- publish logic that:
  - reads `project.json.author`
  - backfills it from current session only when empty
  - reuses the final value for marker output

Keep init-project author writing behavior intact.

**Step 2: Run tests to verify they pass**

Run: `node --test scripts/init-project.test.js scripts/publish.test.js scripts/skill-contract.test.js`
Expected: PASS

### Task 3: Run focused regressions

**Files:**
- Reuse: `scripts/init-project.test.js`
- Reuse: `scripts/publish.test.js`
- Reuse: `scripts/skill-contract.test.js`
- Reuse: `scripts/vitectrl.test.js`

**Step 1: Run regression tests**

Run: `node --test scripts/init-project.test.js scripts/publish.test.js scripts/skill-contract.test.js scripts/vitectrl.test.js`
Expected: PASS

**Step 2: Inspect for regressions**

Confirm:
- init-project metadata shape is unchanged except for author behavior clarity
- publish marker shape is unchanged
- dev preview controller behavior is unchanged

