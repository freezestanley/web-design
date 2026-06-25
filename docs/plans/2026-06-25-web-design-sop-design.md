# Web-Design SOP Design

**Goal:** Define a script-enforced SOP for the `web-design` skill covering project selection, page task confirmation, React page development, static build audit, user preview, and final publish.

**Scope:** This design replaces the current single-file HTML skill behavior with a project-oriented workflow. `webgen` is reference-only and does not define this workflow.

## Objectives

- Enforce the full SOP through Node.js scripts and Gate state, not prompt convention.
- Keep generated frontend projects clean; no workflow control logic should live in app code or `package.json`.
- Store project-private management state under each project's `.webdesign/` directory.
- Support one project with many page tasks, where each page creation or modification gets its own task record.
- Force audit and preview to run against `npm run build` output served as static HTML, never against a dev server.
- Publish two zip artifacts: source code zip and `dist.zip`.

## Global Layout

Skill directory:

```text
web-design/
  SKILL.md
  config.js
  templates/
    scaffold/
      index.html
      package.json
      vite.config.js
      src/...
  scripts/
    init-project.js
    list-projects.js
    resolve-project.js
    gate.js
    publish.js
    lib/
      project-index.js
      project-state.js
      zip.js
      publish-marker.js
      cdp-check.js
      static-preview.js
```

Generated project layout:

```text
<PROJECTS_DIR>/<project-name>/
  .webdesign/
    project.json
    tasks/
      <yyyyMMdd-HHmmss>-<page-slug>/
        workflow.json
        product.md
        design.md
        audit.md
  src/...
  public/...
  package.json
```

## Global Configuration

`config.js` is a JSON config file and owns global constants:

- `PROJECTS_DIR`
- `WEBDESIGN_DIR = ".webdesign"`
- `TASKS_DIR = "tasks"`
- `WORKFLOW_VERSION = "v1"`
- `TEMPLATE_DIR = "templates/scaffold"`

`PROJECTS_DIR` is only for this skill. All new projects created by `web-design` are generated under this directory.

## Project Metadata

Project-level metadata lives in `.webdesign/project.json`.

```json
{
  "name": "promo-618",
  "summary": "618 活动营销项目",
  "template": "scaffold",
  "createdAt": "2026-06-25T10:00:00.000Z",
  "updatedAt": "2026-06-25T12:00:00.000Z",
  "currentTaskId": "20260625-180000-homepage",
  "sourceZipPath": "",
  "distZipPath": ""
}
```

Rules:

- `summary` is the source for the project table description column.
- `updatedAt` is the source for the project table modification time column.
- `sourceZipPath` and `distZipPath` always point to the latest official publish artifacts.

## Task Metadata

Each page create/modify request gets a task directory under `.webdesign/tasks/`.

`workflow.json` example:

```json
{
  "taskId": "20260625-180000-homepage",
  "pageSlug": "homepage",
  "intent": "create",
  "currentGate": "G2_PRODUCT_WRITTEN",
  "blocked": false,
  "blockReason": "",
  "userConfirmations": [],
  "history": [],
  "createdAt": "2026-06-25T10:10:00.000Z",
  "updatedAt": "2026-06-25T10:20:00.000Z"
}
```

Task files:

- `product.md`: collected requirements for this page task
- `design.md`: design plan produced during the design step
- `audit.md`: audit conclusion for built static page, including CDP check, UI walkthrough, fix round, and final PASS/FAIL

## Step 1: Project Confirmation

The skill must always start by scanning `PROJECTS_DIR` and showing all recognized projects in a table with:

- Project name
- Project summary
- Project updated time

Recognition rule:

- Only directories containing `.webdesign/project.json` count as existing managed projects.

Allowed outcomes:

- Create a new project under `PROJECTS_DIR`
- Continue an existing managed project under `PROJECTS_DIR`

No unmanaged project outside that rule may enter the continue flow.

## Step 2: Page Task Confirmation

For each new page or page modification:

1. Create a new task directory.
2. Collect the page requirements:
   - theme
   - assets
   - copy
   - APIs
   - motion
   - audience
   - usage scenario
   - acceptance requirements
3. Write the results to `product.md`.
4. Require explicit user confirmation before advancing.

## Step 3: Development

Development is split into design, implementation, static audit, and preview.

Rules:

- `references/design_workflow.md` must be read before design generation and development.
- `design-taste-frontend` produces the design proposal and writes `design.md`.
- User confirmation is required before moving from design to development.
- All audit and preview activity must happen on static build output.
- `npm run build` must complete before CDP check, UI walkthrough, browser opening, or user preview.
- Dev server preview is not allowed for audit or user preview.
- The LLM must open the built static page in the browser and provide the access URL to the user.
- If the user requests changes after preview, the task returns to development and repeats the modify-build-preview loop.

## Step 4: Publish

Publish is only allowed through `scripts/publish.js`.

The publish flow must:

1. Validate the task Gate is `G9_PUBLISH_READY`.
2. Run `npm run build` again for a clean artifact.
3. Generate two zip files:
   - source code zip
   - `dist.zip`
4. Write those paths back to `.webdesign/project.json`.
5. Print the final publish marker.

Publish marker format:

```text
##publishStart##作者｜源码zip路径｜dist.zip路径｜项目名称｜项目简介##publishEnd##
```

## Gate Model

The internal Gate sequence is:

```text
G0_PROJECT_SELECTED
G1_TASK_CREATED
G2_PRODUCT_WRITTEN
G3_PRODUCT_CONFIRMED
G4_DESIGN_WRITTEN
G5_DESIGN_CONFIRMED
G6_DEVELOPMENT
G7_STATIC_AUDIT_PASSED
G8_PREVIEW_CONFIRMED
G9_PUBLISH_READY
DONE
```

Gate meaning:

- `G0_PROJECT_SELECTED`: project context has been resolved
- `G1_TASK_CREATED`: page task directory exists
- `G2_PRODUCT_WRITTEN`: `product.md` has been written
- `G3_PRODUCT_CONFIRMED`: user confirmed product requirements
- `G4_DESIGN_WRITTEN`: `design.md` has been written
- `G5_DESIGN_CONFIRMED`: user confirmed design
- `G6_DEVELOPMENT`: code implementation or revision in progress
- `G7_STATIC_AUDIT_PASSED`: static build succeeded and `audit.md` passed
- `G8_PREVIEW_CONFIRMED`: static page was opened, URL was shown to user, and user confirmed preview
- `G9_PUBLISH_READY`: publish is permitted
- `DONE`: publish completed

Transition rules:

- `G2 -> G3` requires explicit user confirmation text.
- `G4 -> G5` requires explicit user confirmation text.
- `G6 -> G7` requires built static page audit to pass and `audit.md` to exist.
- `G7 -> G8` requires browser-opened static preview and URL disclosure to the user.
- `G8 -> G9` requires explicit user approval to publish.
- `G9 -> DONE` cannot use generic Gate advance; only `publish.js` may complete the task.
- Preview feedback that requests changes reopens the task to `G6_DEVELOPMENT`.

## Script Responsibilities

`scripts/list-projects.js`

- Scan `PROJECTS_DIR`
- Return project rows from `.webdesign/project.json`

`scripts/resolve-project.js`

- Resolve a project by name within `PROJECTS_DIR`

`scripts/init-project.js`

- Copy `templates/scaffold/`
- Initialize `.webdesign/project.json`
- Create the initial task directory and task files

`scripts/gate.js`

- `status <projectPath> <taskId>`
- `advance <projectPath> <taskId> --confirm "..."`
- `block <projectPath> <taskId> "<reason>"`
- `unblock <projectPath> <taskId>`
- `reopen-dev <projectPath> <taskId> --reason "..."`

`scripts/lib/static-preview.js`

- Serve built `dist/`
- Return accessible local URL

`scripts/lib/cdp-check.js`

- Connect to CDP
- Check browser console and page runtime on the static preview URL

`scripts/publish.js`

- Enforce `G9_PUBLISH_READY`
- Rebuild
- Generate zip artifacts
- Update project metadata
- Print publish marker

## SKILL.md and AGENTS.md Constraints

Both documents must enforce:

- Page creation, modification, preview, build, and publish must go through `web-design`.
- Gate skipping is forbidden.
- Confirmation gates require explicit user approval.
- Publish may not bypass `publish.js`.
- Page revisions after preview must reopen development.
