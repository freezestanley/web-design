# Web-Design SOP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `web-design` skill into a Node.js-driven SOP controller for React page projects from project selection through static preview and publish.

**Architecture:** Keep generated projects as plain React/Vite apps and move all workflow enforcement into skill-owned Node.js scripts plus `.webdesign` metadata. Model each page request as a task under a managed project, advance it through a Gate FSM, and require build-based audit and preview before publish.

**Tech Stack:** Node.js, CommonJS scripts, Vite React scaffold, Markdown metadata, Node test runner

---

### Task 1: Create global config and shared constants

**Files:**
- Create: `config.js`
- Test: `scripts/config.test.js`

**Step 1: Write the failing test**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../config");

test("config exposes managed directory constants", () => {
  assert.equal(typeof config.PROJECTS_DIR, "string");
  assert.equal(config.WEBDESIGN_DIR, ".webdesign");
  assert.equal(config.TASKS_DIR, "tasks");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test scripts/config.test.js`
Expected: FAIL because `config.js` does not exist.

**Step 3: Write minimal implementation**

Implement `config.js` with:
- `PROJECTS_DIR`
- `WEBDESIGN_DIR`
- `TASKS_DIR`
- `WORKFLOW_VERSION`
- `TEMPLATE_DIR`
as JSON content, then load it via a shared config loader instead of `require("../config")`.

**Step 4: Run test to verify it passes**

Run: `node --test scripts/config.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add config.js scripts/config.test.js
git commit -m "feat: add web-design global config"
```

### Task 2: Build project metadata helpers

**Files:**
- Create: `scripts/lib/project-state.js`
- Create: `scripts/project-state.test.js`

**Step 1: Write the failing test**

Add tests for:
- locating `.webdesign/project.json`
- reading and writing project metadata
- creating task IDs like `20260625-180000-homepage`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/project-state.test.js`
Expected: FAIL because helper does not exist.

**Step 3: Write minimal implementation**

Implement helpers for:
- `getProjectMetaPath(projectPath)`
- `readProjectMeta(projectPath)`
- `writeProjectMeta(projectPath, meta)`
- `buildTaskId(date, slug)`

**Step 4: Run test to verify it passes**

Run: `node --test scripts/project-state.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/lib/project-state.js scripts/project-state.test.js
git commit -m "feat: add project state helpers"
```

### Task 3: Implement project discovery and table data source

**Files:**
- Create: `scripts/lib/project-index.js`
- Create: `scripts/list-projects.js`
- Create: `scripts/project-index.test.js`
- Create: `scripts/list-projects.test.js`

**Step 1: Write the failing test**

Test cases:
- only managed projects with `.webdesign/project.json` are returned
- table rows contain `name`, `summary`, `updatedAt`
- rows are sorted by `updatedAt` descending

**Step 2: Run test to verify it fails**

Run: `node --test scripts/project-index.test.js scripts/list-projects.test.js`
Expected: FAIL because scripts do not exist.

**Step 3: Write minimal implementation**

Implement:
- directory scanning under `PROJECTS_DIR`
- `listProjects()` returning all rows
- CLI wrapper that prints JSON for the skill to render as a table

**Step 4: Run test to verify it passes**

Run: `node --test scripts/project-index.test.js scripts/list-projects.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/lib/project-index.js scripts/list-projects.js scripts/project-index.test.js scripts/list-projects.test.js
git commit -m "feat: add managed project discovery"
```

### Task 4: Implement project resolution and initialization

**Files:**
- Create: `templates/scaffold/index.html`
- Create: `templates/scaffold/package.json`
- Create: `templates/scaffold/vite.config.js`
- Create: `templates/scaffold/src/main.jsx`
- Create: `scripts/resolve-project.js`
- Create: `scripts/init-project.js`
- Create: `scripts/resolve-project.test.js`
- Create: `scripts/init-project.test.js`

**Step 1: Write the failing test**

Test cases:
- resolve finds project path only inside `PROJECTS_DIR`
- init copies scaffold into project root
- init creates `.webdesign/project.json`
- init creates `.webdesign/tasks/<task-id>/workflow.json`
- init creates `product.md`, `design.md`, `audit.md`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/resolve-project.test.js scripts/init-project.test.js`
Expected: FAIL because scripts do not exist.

**Step 3: Write minimal implementation**

Implement project init flow:
- create project root under `PROJECTS_DIR`
- copy scaffold files
- initialize project metadata
- create initial task with slug and intent

**Step 4: Run test to verify it passes**

Run: `node --test scripts/resolve-project.test.js scripts/init-project.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add templates/scaffold scripts/resolve-project.js scripts/init-project.js scripts/resolve-project.test.js scripts/init-project.test.js
git commit -m "feat: add project init and resolution flow"
```

### Task 5: Implement the Gate FSM for task workflow

**Files:**
- Create: `scripts/gate.js`
- Create: `scripts/gate.test.js`

**Step 1: Write the failing test**

Cover:
- legal Gate order
- confirmation requirement for `G3`, `G5`, `G9`
- `G6 -> G7` requires `audit.md`
- `G9 -> DONE` must fail when using generic advance
- `reopen-dev` returns task to `G6_DEVELOPMENT`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/gate.test.js`
Expected: FAIL because `gate.js` does not exist.

**Step 3: Write minimal implementation**

Implement:
- `status`
- `advance`
- `block`
- `unblock`
- `reopen-dev`

Validate task files and confirmation arguments before any transition.

**Step 4: Run test to verify it passes**

Run: `node --test scripts/gate.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/gate.js scripts/gate.test.js
git commit -m "feat: add task gate state machine"
```

### Task 6: Implement static preview and CDP audit helpers

**Files:**
- Create: `scripts/lib/static-preview.js`
- Create: `scripts/lib/cdp-check.js`
- Create: `scripts/static-preview.test.js`
- Create: `scripts/cdp-check.test.js`

**Step 1: Write the failing test**

Cover:
- static preview serves `dist/` and returns URL metadata
- CDP checker rejects missing URL
- audit helper returns structured result for console errors and pass/fail summary

**Step 2: Run test to verify it fails**

Run: `node --test scripts/static-preview.test.js scripts/cdp-check.test.js`
Expected: FAIL because helpers do not exist.

**Step 3: Write minimal implementation**

Implement:
- lightweight static file server around `dist/`
- structured CDP check wrapper that the skill can call before writing `audit.md`

**Step 4: Run test to verify it passes**

Run: `node --test scripts/static-preview.test.js scripts/cdp-check.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/lib/static-preview.js scripts/lib/cdp-check.js scripts/static-preview.test.js scripts/cdp-check.test.js
git commit -m "feat: add static preview and cdp audit helpers"
```

### Task 7: Implement publish flow with dual zip output

**Files:**
- Create: `scripts/lib/zip.js`
- Create: `scripts/lib/publish-marker.js`
- Create: `scripts/publish.js`
- Create: `scripts/publish.test.js`

**Step 1: Write the failing test**

Cover:
- publish only runs from `G9_PUBLISH_READY`
- publish rebuilds project
- publish creates source zip and dist zip
- publish updates `.webdesign/project.json`
- publish prints `##publishStart##作者｜源码zip路径｜dist.zip路径｜项目名称｜项目简介##publishEnd##`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/publish.test.js`
Expected: FAIL because publish flow does not exist.

**Step 3: Write minimal implementation**

Implement:
- zip generation helpers
- publish marker formatter
- publish script that rebuilds, zips, updates metadata, and completes Gate to `DONE`

**Step 4: Run test to verify it passes**

Run: `node --test scripts/publish.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/lib/zip.js scripts/lib/publish-marker.js scripts/publish.js scripts/publish.test.js
git commit -m "feat: add publish flow with dual zip artifacts"
```

### Task 8: Rewrite skill instructions and installation guidance

**Files:**
- Modify: `SKILL.md`
- Create: `AGENTS.md`

**Step 1: Write the failing test**

Create a manual checklist in the plan and validate that `SKILL.md` includes:
- SOP-first flow
- mandatory project table step
- mandatory task confirmation step
- static build audit and preview rules
- publish-only-through-script rule

**Step 2: Run validation to verify current docs fail**

Run: `rg -n "PROJECTS_DIR|G7_STATIC_AUDIT_PASSED|publishStart|web-design" SKILL.md AGENTS.md`
Expected: FAIL or incomplete coverage.

**Step 3: Write minimal implementation**

Update `SKILL.md` to:
- describe the new workflow
- describe required scripts
- include installation prerequisites
- require reading `references/design_workflow.md` before Step 3 design/development work
- state that all page create/modify/build/preview/publish work must use `web-design`

Create `AGENTS.md` with the same hard rule.

**Step 4: Run validation to verify it passes**

Run: `rg -n "PROJECTS_DIR|G7_STATIC_AUDIT_PASSED|publishStart|web-design" SKILL.md AGENTS.md`
Expected: PASS with all required rule lines present.

**Step 5: Commit**

```bash
git add SKILL.md AGENTS.md
git commit -m "docs: rewrite web-design skill workflow"
```

### Task 9: Run full regression and smoke verification

**Files:**
- Reuse: `scripts/*.test.js`

**Step 1: Run the full test suite**

Run: `node --test scripts/*.test.js`
Expected: PASS

**Step 2: Run an end-to-end smoke flow**

Run:

```bash
node scripts/init-project.js demo-project homepage create
node scripts/list-projects.js
node scripts/gate.js status <project-path> <task-id>
```

Expected:
- managed project appears in the project list
- project contains `.webdesign/`
- task starts at the expected Gate

**Step 3: Commit**

```bash
git add .
git commit -m "test: verify web-design sop end-to-end"
```
