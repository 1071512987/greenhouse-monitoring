# Full-stack Greenhouse Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and run a polished single-screen React monitoring dashboard, sensor explorer, and Agent execution workspace backed by a tested Go HTTP API.

**Architecture:** A Vite React TypeScript SPA consumes a Go standard-library JSON API through a development proxy. The backend owns simulated greenhouse state and Agent run orchestration behind an interface that can later be replaced by the user's model implementation. Production mode lets Go serve the built frontend directory.

**Tech Stack:** React 19, TypeScript, Vite, Recharts, Lucide React, Vitest, Go 1.25 standard library.

## Global Constraints

- Dashboard desktop layout must fit in one viewport without vertical scrolling at 1440x900.
- UI copy is Chinese and must contain no mojibake.
- Real sensor connectivity and a real Agent model are replaceable adapters; this delivery uses deterministic simulation.
- Keyboard focus, responsive mobile layout, reduced-motion support, loading, empty, and error states are required.

---

### Task 1: Go greenhouse API

**Files:**
- Create: `backend/go.mod`
- Create: `backend/internal/domain/models.go`
- Create: `backend/internal/store/store.go`
- Create: `backend/internal/agent/engine.go`
- Create: `backend/internal/httpapi/server.go`
- Create: `backend/internal/httpapi/server_test.go`
- Create: `backend/cmd/server/main.go`

**Interfaces:**
- Produces: `GET /api/health`, `GET /api/dashboard`, `GET /api/sensors`, `GET /api/agent/runs`, `POST /api/agent/runs`.
- Agent execution consumes `{sourceName, observations[]}` and returns a persisted decision run.

- [ ] Write HTTP tests asserting health, dashboard shape, sensor list, valid Agent execution, invalid empty observations, and run history.
- [ ] Run `go test ./...` and verify the tests fail because the server package is absent.
- [ ] Implement domain models, concurrency-safe simulated store, replaceable rule Agent engine, routes, JSON errors, CORS, and static-file fallback.
- [ ] Run `go test ./...` and verify all tests pass.

### Task 2: React data layer

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/lib/importData.ts`
- Create: `frontend/src/lib/importData.test.ts`
- Create: `frontend/src/lib/api.ts`

**Interfaces:**
- Produces: typed API clients and `parseObservationFile(name, text): Observation[]` for JSON/CSV imports.

- [ ] Write Vitest cases for JSON import, CSV import, aliases, and invalid files.
- [ ] Install dependencies and run the focused test to verify failure because the parser is absent.
- [ ] Implement typed models, parser validation, and API client with actionable errors.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Single-screen dashboard and navigation

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/styles.css`
- Create: `frontend/src/components/AppShell.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/pages/SensorsPage.tsx`
- Create: `frontend/src/components/MetricTile.tsx`
- Create: `frontend/src/components/StatusMark.tsx`

**Interfaces:**
- Consumes: Dashboard and sensor API data.
- Produces: responsive Dashboard, sensor explorer, and app navigation.

- [ ] Implement the greenhouse control-room token system, focus states, reduced motion, and responsive app shell.
- [ ] Implement the 1440x900 single-viewport dashboard with metric rail, environmental chart, daylight band, zone comparison, health, and alert feed.
- [ ] Implement searchable/filterable sensors with clear loading, empty, and error states.
- [ ] Run `npm run typecheck` and resolve every TypeScript error.

### Task 4: Agent inference workspace

**Files:**
- Create: `frontend/src/pages/AgentPage.tsx`
- Create: `frontend/src/components/DecisionTrace.tsx`

**Interfaces:**
- Consumes: observation import parser and Agent run API.
- Produces: file import, sample dataset, preview, run controls, decision summary, execution trace, actions, and history.

- [ ] Build JSON/CSV upload and sample-data entry with validation feedback.
- [ ] Submit observations to the backend and render decision confidence, reasoning trace, recommended actions, and history.
- [ ] Run frontend unit tests and type checking.

### Task 5: Integration and visual verification

**Files:**
- Create: `README.md`
- Create: `.gitignore`

**Interfaces:**
- Produces: documented one-command development workflow and production build workflow.

- [ ] Run `go test ./...`, `npm test -- --run`, `npm run typecheck`, and `npm run build`.
- [ ] Start Go on port 8080 and Vite on port 5173, then verify health and proxied API responses.
- [ ] Open the app, inspect Dashboard, sensors, and Agent pages at desktop and mobile sizes, and fix visual/runtime issues.
- [ ] Re-run the complete verification suite after fixes.
