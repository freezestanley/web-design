# Scaffold Dual Build Singlefile Design

**Goal:** Make scaffolded projects produce both the normal Vite `dist/` output and an additional single-file HTML artifact from one `npm run build`.

**Scope:** This change is limited to the scaffold template and its template tests. It must not change the publish SOP or replace the existing standard build output.

## Objectives

- Preserve the current default Vite build output in `dist/`.
- Keep the existing `dist.zip` behavior tied to the normal build output.
- Add a second build target that emits a standalone HTML artifact using `vite-plugin-singlefile`.
- Ensure `npm run build` remains the only command needed for both outputs.
- Keep the single-file artifact isolated from `dist/` so publish and preview flows do not regress.

## Chosen Approach

Use two sequential Vite builds triggered by a single `npm run build` script.

Why this approach:

- It keeps the current `vite.config.js` behavior stable for the normal app build.
- It avoids mixing `vite-plugin-singlefile` semantics into the standard multi-file output.
- It makes output boundaries explicit: normal assets stay in `dist/`, single-file output goes to a separate directory.
- It is easy to test at the template level without introducing workflow risk into `publish.js`.

## Output Layout

Normal build:

- `dist/`
- `dist.zip` from the existing zip plugin

Single-file build:

- `dist-single/index.html`

The single-file output directory is intentionally separate so any existing publish logic that assumes `dist/` continues to work unchanged.

## Files To Change

- `templates/scaffold/package.json`
- `templates/scaffold/vite.config.js`
- `templates/scaffold/vite.singlefile.config.js`
- `scripts/scaffold-template.test.js`

## Build Design

`package.json` will change `build` from one Vite invocation to a chained command:

- first run the current standard build with `vite.config.js`
- then run a second build with `vite.singlefile.config.js`

`vite.config.js` remains focused on:

- React plugin
- normal build output
- `@adjfut/vite-plugin-zip-pack` producing `dist.zip`

`vite.singlefile.config.js` will:

- use the React plugin
- use `vite-plugin-singlefile`
- write to `dist-single/`
- keep its output independent from the normal build

## Test Strategy

Use existing scaffold template tests and extend them to prove:

- scaffold package includes `vite-plugin-singlefile`
- scaffold contains `vite.singlefile.config.js`
- `build` script runs both builds
- normal Vite config still wires React and zip-pack
- single-file Vite config wires React and `vite-plugin-singlefile`

## Risks And Mitigations

Risk: The single-file plugin may rewrite build assumptions in ways that conflict with normal output.
Mitigation: keep it in a separate config and separate output directory.

Risk: publish flow may accidentally start using the wrong artifact.
Mitigation: do not change `publish.js`; it still zips `dist/` only.

Risk: future scaffold edits may remove the dual-build contract.
Mitigation: pin that contract in `scripts/scaffold-template.test.js`.

## Notes

- This workspace is not currently attached to a Git repository, so the design is documented locally but cannot be committed here.
