# Vitectrl Design

**Goal:** Add a managed dev-preview controller under `scripts/vitectrl/` that prevents uncontrolled Vite process accumulation by keeping only the most recent five managed services.

**Scope:** This change is limited to a new `scripts/vitectrl/` controller, its registry/process helpers, and tests. It must not change the publish flow or the scaffold template.

## Objectives

- Add a single entrypoint for managed dev preview.
- Store managed service state in a fixed file next to the controller.
- Ensure repeated starts for the same project do not leave multiple live dev servers behind.
- Ensure no more than five managed dev services remain alive at once.
- Clean dead records automatically before status, cleanup, and start operations.
- Avoid scanning or killing unrelated user processes outside this controller.

## Chosen Approach

Use a controller-owned registry file plus PID-based process management.

Why this approach:

- It avoids fragile system-wide Vite process scans.
- It limits cleanup to services started by this controller, reducing accidental kills.
- It works across multiple projects because the registry is shared and fixed.
- It lets `start`, `status`, and `cleanup` share the same cleanup and retention logic.

## Registry Design

Registry file:

- `scripts/vitectrl/registry.json`

Each record stores:

- `pid`
- `port`
- `url`
- `projectPath`
- `command`
- `startedAt`

The file format will be a JSON object with a `services` array to allow future metadata expansion.

## Command Design

### `start <project-path>`

Behavior:

- resolve the project path
- remove dead records from the registry
- terminate any existing managed service for the same `projectPath`
- choose a free port
- spawn `npm run dev -- --host 127.0.0.1 --port <port> --strictPort`
- wait until the chosen port is reachable
- add the new service to the registry
- evict oldest managed services until only five remain
- print JSON describing the new service and any evicted services

### `status`

Behavior:

- remove dead records from the registry
- print the current live managed services as JSON

### `cleanup`

Behavior:

- remove dead records from the registry
- if more than five remain, terminate the oldest until only five remain
- print JSON describing the remaining and evicted services

## Process Management

Managed services will be started as detached child processes.

For cleanup:

- use `process.kill(pid, 0)` to test liveness
- use `SIGTERM` first
- wait briefly for exit
- fall back to `SIGKILL` if still alive

## Files To Change

- `scripts/vitectrl/dev-preview.js`
- `scripts/vitectrl/lib/controller.js`
- `scripts/vitectrl/lib/process.js`
- `scripts/vitectrl/lib/registry.js`
- `scripts/vitectrl.test.js`
- `.gitignore`

## Test Strategy

Add focused tests to prove:

- starting a second preview for the same project terminates the older managed one
- starting more than five managed previews evicts the oldest services
- dead PIDs are removed from the registry during status/cleanup
- the fixed registry file path can be overridden in tests to avoid mutating repo state

## Risks And Mitigations

Risk: detached processes can survive failed setup.
Mitigation: wait for the port to become reachable and kill the child on startup failure.

Risk: a fixed registry file in the repo can become noisy.
Mitigation: ignore `scripts/vitectrl/registry.json` in `.gitignore` and recreate it as needed.

Risk: Vite startup output can vary and be hard to parse.
Mitigation: assign the port ourselves and verify readiness by probing the port instead of parsing stdout.

