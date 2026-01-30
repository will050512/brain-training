# Draft: PWA crash/white screen + version update gating

## Requirements (confirmed)
- User wants a step-by-step plan to address a PWA launch crash/white screen that shows “loading data”.
- Add version-based update gating so updates only apply when version changes.
- Provide parallel task graph, detailed TODOs, required files, risks, and verification/test plan.
- Planning only; no code changes.
- Issue reproduces on Android Chrome PWA + iOS Safari + Desktop.
- Version source: Vite build hash.
- Update timing: silent update only when version differs.
- Verification: run build/test.

## Technical Decisions
- Existing PWA uses vite-plugin-pwa with registerType=autoUpdate and workbox skipWaiting/clientsClaim enabled.
- usePWA composable handles update state, auto-update in background, controllerchange reload.
- Bootstrap sequence initializes DB/migrations/sync before mounting app.

## Research Findings
- Key files:
  - src/composables/usePWA.ts (update flow, autoUpdate hooks, controllerchange reload)
  - vite.config.ts (VitePWA config: autoUpdate, skipWaiting=true, clientsClaim=true)
  - src/main.ts (bootstrap before mount; error catch still mounts)
  - docs/pwa-update-fix.md (prior update flow adjustments and UI gating notes)

## Open Questions
- Where should the build hash be stored and compared? (localStorage vs IndexedDB vs cache metadata)
- How should the SW/app exchange version info? (inject into SW via define, or fetch version file)
- Any tolerance for brief reloads on startup, or must avoid reload during critical data init?
- Should we change workbox skipWaiting/clientsClaim behavior, or implement gating in app only?

## Scope Boundaries
- INCLUDE: Diagnose boot/PWA update flow; version gating logic; verification strategy.
- EXCLUDE: Implementing fixes (planning only).
