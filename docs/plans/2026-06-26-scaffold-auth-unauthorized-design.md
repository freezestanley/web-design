# Scaffold Auth Unauthorized Design

**Goal:** Add a reusable unauthorized page and placeholder SSO auth utilities to the scaffold so protected routes can redirect consistently when access validation fails.

**Scope:** This change is limited to the scaffold template and scaffold template tests. It must not alter publish, gate, or preview workflow scripts.

## Objectives

- Add a fixed unauthorized route to the scaffold.
- Show the exact message `抱歉您无权限查看当前页面` on that route.
- Provide placeholder auth helpers that future projects can replace with real SSO logic.
- Centralize auth enforcement in routing instead of duplicating checks in each page.
- Keep the default scaffold usable even before a real backend SSO contract exists.

## Chosen Approach

Use a route-level auth wrapper plus a small shared auth helper module.

Why this approach:

- It makes auth opt-in per route through route metadata instead of scattering `useEffect` checks across pages.
- It keeps the placeholder SSO behavior isolated to one shared module that can be swapped later.
- It lets scaffolded pages demonstrate the full unauthorized redirect path immediately.
- It minimizes future migration cost when a real token source or SSO validation API is introduced.

## Route Design

Add two default routes:

- `/`
  - renders the existing home page
  - marked as protected with `requireAuth: true`
- `/unauthorized`
  - renders a dedicated unauthorized page
  - never redirects again

Protected routes will be wrapped by a guard component that:

- reads a placeholder token source
- evaluates access through a shared validation function
- redirects to `/unauthorized` when validation fails

## Auth Utility Design

Add a shared module under `src/shared/auth/` with placeholder functions:

- `getSsoToken()`
  - reads a demo token from URL query first, then localStorage
- `validateSsoAccess()`
  - returns whether a token exists and passes a placeholder validity rule
- `redirectToUnauthorized()`
  - returns the route path used by auth failures

The placeholder logic should be intentionally simple:

- no network request
- no coupling to a real SSO schema
- obvious extension points through comments and function boundaries

## UI Design

Add a standalone unauthorized page with:

- the exact Chinese message `抱歉您无权限查看当前页面`
- a short supporting sentence explaining that current access verification did not pass
- a low-noise layout that matches the existing scaffold aesthetic

## Files To Change

- `templates/scaffold/src/app/router.jsx`
- `templates/scaffold/src/pages/home/index.jsx`
- `templates/scaffold/src/pages/unauthorized/index.jsx`
- `templates/scaffold/src/shared/auth/index.js`
- `templates/scaffold/src/styles/main.css`
- `scripts/scaffold-template.test.js`

## Test Strategy

Extend scaffold template tests to prove:

- the scaffold includes the unauthorized page file
- the scaffold includes the shared auth helper file
- router defines the `/unauthorized` route
- router marks the home route as protected
- router wires auth redirect behavior through the shared helper
- unauthorized page contains the required Chinese copy

## Risks And Mitigations

Risk: placeholder auth could be mistaken for real security.
Mitigation: keep naming explicit, keep logic minimal, and document it as a replaceable scaffold utility.

Risk: protecting the home route by default may surprise teams using the scaffold for public pages.
Mitigation: keep protection opt-out simple by expressing it as route metadata that can be removed per project.

Risk: auth logic in the router could become hard to test if tightly coupled to browser globals.
Mitigation: keep token lookup and redirect path in a dedicated shared module and validate wiring through template contract tests.

