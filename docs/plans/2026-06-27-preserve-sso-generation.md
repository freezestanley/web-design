# Preserve SSO Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent generated projects from removing scaffold SSO, router, and authenticated HTTP wiring unless the user explicitly asks for a public page.

**Architecture:** Tighten the `web-design` skill contract so generated page work preserves scaffold auth infrastructure by default, and remove template copy that currently suggests replacing route structure and SSO. Enforce both with contract tests so regressions fail before shipment.

**Tech Stack:** Node.js test runner, Markdown skill contract, React scaffold template

---

### Task 1: Add failing contract tests

**Files:**
- Modify: `scripts/skill-contract.test.js`
- Modify: `scripts/scaffold-template.test.js`

**Step 1: Write the failing tests**

- Add a skill contract test that requires:
  - default preservation of `src/app/router.jsx`
  - default preservation of `src/shared/auth/*`
  - default preservation of `src/shared/http/axios-instance.js`
  - explicit user confirmation before converting the scaffold to a public page
- Add a scaffold template test that requires:
  - home page copy to tell implementers to keep auth/router/http wiring
  - removal of wording that suggests replacing route structure or real SSO validation wholesale

**Step 2: Run tests to verify they fail**

Run: `node --test scripts/skill-contract.test.js scripts/scaffold-template.test.js`

Expected: FAIL on the new preservation assertions.

### Task 2: Update the skill and scaffold wording

**Files:**
- Modify: `SKILL.md`
- Modify: `templates/scaffold/src/pages/home/index.jsx`

**Step 1: Write minimal implementation**

- Add explicit `web-design` rules that generated page tasks must preserve scaffold auth/router/http files by default.
- Allow removal only when the user explicitly confirms a public page with no SSO requirement.
- Update scaffold home page copy to instruct replacing page content while keeping auth/router/http wiring intact.

**Step 2: Run tests to verify they pass**

Run: `node --test scripts/skill-contract.test.js scripts/scaffold-template.test.js`

Expected: PASS.

### Task 3: Run broader regression verification

**Files:**
- Test: `scripts/gate.test.js`
- Test: `scripts/init-project.test.js`
- Test: `scripts/publish.test.js`

**Step 1: Run regression checks**

Run: `node --test scripts/skill-contract.test.js scripts/scaffold-template.test.js scripts/publish.test.js scripts/gate.test.js scripts/init-project.test.js`

Expected: PASS with zero failures.
