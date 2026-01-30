# Draft: Startup white screen + sync blocking

## Requirements (confirmed)
- Produce a step-by-step plan to fix startup 20s white screen + sync blocking.
- Expected outcomes: parallel task graph, concrete steps, candidate code changes, instrumentation plan, success criteria, and test plan.
- Required tools to use during planning: Read, Grep, Glob, LSP diagnostics.
- Must use known facts provided by user (see Scope Boundaries / Evidence).
- Must NOT modify files; do not propose speculative changes without tying to evidence.
- Context: issue only when online and logged in; offline or not logged in no delay.
- Sync target: Google Sheets (~5000 rows) and should be background (non-blocking).
- Scope decision: frontend-only changes (no Apps Script changes).
- Startup target: first meaningful render ≤ 2s when online + logged-in; full sync may continue in background.
- Instrumentation: lightweight perf marks/console timings OK, ideally behind a dev flag.
- Behavioral constraint: non-critical backfills and sheet restores may be deferred; must preserve data integrity and eventual consistency.

## Evidence (from repo reads)
- Startup bootstrap awaits DB + migrations + dataInitService.initialize + quickLogin before mount.
  - Source: src/main.ts:39-73 (await initDatabase, initMigrations, dataInitService.initialize, userStore.quickLogin, then app.mount).
- App.vue gate blocks until restoreSession + dataInitService.initialize; also triggers sync/backfill on login.
  - Source: src/App.vue:60-93 (load gate), 260-88 (onMounted: await restoreSession; await dataInitService.initialize; bootGateState=ready).
- restoreSession calls quickLogin; quickLogin awaits dataInitService.initUserData(odId, { mode: 'delta' }).
  - Source: src/stores/userStore.ts:710-714 (restoreSession), 442-71 (quickLogin).
- initUserData (delta/full) performs restore from sheet + backfills; runBackgroundFullSync also exists.
  - Source: src/services/dataInitService.ts:78-145, 192-229.
- restoreAllUserDataFromSheet performs multiple network fetches and paged list with limit=500; can iterate up to 200 pages.
  - Source: src/services/sheetRestoreService.ts:34-47 (throttle), 34-47, 34-47, 34-47, 34-47 (throttle), 234-47 (paged fetch loop), 249-54 (limit=500), 567-713 (restoreAllUserDataFromSheet).
- Migrations read full stores (gameSessions/users) during initMigrations.
  - Source: src/services/migrationService.ts:95-161 (gameSessions full read), 168-255 (users + gameSessions full read).
- PWA update checks run on App mount (checkForUpdates) and in usePWA.
  - Source: src/App.vue:260-63, src/composables/usePWA.ts:33-52.
- Asset preload is non-blocking (per user provided fact; not verified yet in code).

## Scope Boundaries
- INCLUDE: startup flow, session restore, sync restore/backfill behavior, PWA update check, migrations, DB init.
- EXCLUDE: unrelated UI refactors or changes not tied to measured startup delay.

## Technical Decisions
- Frontend-only scope; no Apps Script changes.
- Target first meaningful render ≤ 2s (online + logged-in).
- Allow deferring non-critical backfills/restore while preserving eventual consistency.
- Instrumentation allowed (prefer dev-flagged).

## Open Questions
- Test strategy decision: Should this plan include automated tests (Vitest/Playwright) or rely on manual verification only?

## Notes
- LSP diagnostics attempted but language servers not available in environment (typescript-language-server, vue-language-server).
