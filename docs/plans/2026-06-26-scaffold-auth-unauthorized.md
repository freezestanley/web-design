# Scaffold Auth Unauthorized Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a scaffold unauthorized page and placeholder SSO auth utilities so protected routes redirect consistently when access validation fails.

**Architecture:** Keep the current Vite React scaffold intact and add a small shared auth module plus a route guard wrapper in `router.jsx`. Protect the default home route with route metadata and send failures to a dedicated `/unauthorized` page that ships with the template.

**Tech Stack:** React 18, React Router 6, Vite 5, Node.js test runner

---

### Task 1: Lock the new scaffold auth contract in tests

**Files:**
- Modify: `scripts/scaffold-template.test.js`
- Test: `scripts/scaffold-template.test.js`

**Step 1: Write the failing test**

Add assertions for:
- `src/pages/unauthorized/index.jsx` exists
- `src/shared/auth/index.js` exists
- `router.jsx` contains `/unauthorized`
- `router.jsx` marks the home route with `requireAuth: true`
- `router.jsx` references the shared auth helper
- unauthorized page contains `抱歉您无权限查看当前页面`

**Step 2: Run test to verify it fails**

Run: `node --test scripts/scaffold-template.test.js`
Expected: FAIL because the scaffold does not yet include the unauthorized page or auth wiring.

**Step 3: Write minimal implementation for the test**

Update the scaffold contract test only enough to describe the new expected behavior.

**Step 4: Run test to verify it fails for the right reason**

Run: `node --test scripts/scaffold-template.test.js`
Expected: FAIL with missing file or missing route/auth assertions.

### Task 2: Add placeholder auth helpers and unauthorized page

**Files:**
- Add: `templates/scaffold/src/shared/auth/index.js`
- Add: `templates/scaffold/src/pages/unauthorized/index.jsx`
- Modify: `templates/scaffold/src/styles/main.css`
- Test: `scripts/scaffold-template.test.js`

**Step 1: Write the minimal implementation**

Create scaffold auth helpers that:
- read a placeholder token from query or localStorage
- return a simple allow/deny result
- expose a redirect target for unauthorized access

Create the unauthorized page with the required Chinese message and simple supporting copy.

**Step 2: Run test to verify it still fails only on router wiring**

Run: `node --test scripts/scaffold-template.test.js`
Expected: FAIL only on missing router protection assertions if file existence and copy are now satisfied.

### Task 3: Protect the default route through router metadata

**Files:**
- Modify: `templates/scaffold/src/app/router.jsx`
- Modify: `templates/scaffold/src/pages/home/index.jsx`
- Test: `scripts/scaffold-template.test.js`

**Step 1: Write the minimal implementation**

Update the router to:
- declare route metadata for protected routes
- wrap protected pages in a guard component
- redirect failed validation to `/unauthorized`
- keep the unauthorized route public

Adjust home page copy only if needed so the scaffold still reads coherently as a protected starter page.

**Step 2: Run test to verify it passes**

Run: `node --test scripts/scaffold-template.test.js`
Expected: PASS

### Task 4: Run focused regressions

**Files:**
- Reuse: `scripts/scaffold-template.test.js`
- Reuse: `scripts/init-project.test.js`
- Reuse: `scripts/publish.test.js`

**Step 1: Run regression tests**

Run: `node --test scripts/scaffold-template.test.js scripts/init-project.test.js scripts/publish.test.js`
Expected: PASS

**Step 2: Inspect for unintended workflow regressions**

Confirm:
- scaffold copy behavior still works
- publish assumptions about build outputs remain unchanged
- no existing scaffold contract broke outside routing

