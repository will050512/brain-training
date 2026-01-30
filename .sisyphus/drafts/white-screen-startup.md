# Draft: White Screen Startup Diagnostics Plan

## Requirements (confirmed)
- Build an execution plan to diagnose and solve ~20s white screen startup in PWA + browser.
- Include parallel tasks and validation steps.
- Include specific file targets, hypotheses, success criteria, and test plan.
- Highlight user info needed.
- Must not modify files.
- Use required tools: Read, Grep, Glob, LSP diagnostics.
- Use current context: startup flow (main.ts, App.vue gating), sync services, PWA.
- Sync target is Google Sheets.
- User wants background sync (no blocking).

## Technical Decisions
- None yet (awaiting codebase inspection and user clarifications).

## Research Findings
- Agent results pending/failed; will proceed with direct code inspection.
- Startup flow in `src/main.ts`: app mount occurs after awaited initDatabase → initMigrations → dataInitService.initialize → quickLogin; then registerAllGames; only after these awaits app.mount happens.
- App gate in `src/App.vue`: `bootGateState` defaults `loading` and blocks UI until onMounted completes; onMounted awaits restoreSession, consent checks, background backfills, then awaits dataInitService.initialize again before setting bootGateState = 'ready'.
- App.vue also triggers backfillUserSessionsToSheet, syncUserProfileToSheet, backfillAllUserDataToSheet on login/consent; these are currently invoked during boot path (potentially heavy).
- PWA update flow in `src/composables/usePWA.ts`: controllerchange triggers reload after boot ready; update gate overlays when updating; checkForUpdates called on mount.
- LSP diagnostics failed to run due to missing language servers (typescript-language-server / vue-language-server).

## Open Questions
- What exact repro steps (cold start vs warm start, first launch vs subsequent, offline/online)?
- Which device/browser/OS? PWA installed or browser tab? Any private mode?
- Any console/network errors during the 20s white screen? Any Service Worker errors?
- Does the delay correlate with data migration (DB version change) or sync/backfill activity?
- Are there very large local datasets (many sessions) for affected users?

## Scope Boundaries
- INCLUDE: Diagnostic plan, hypotheses, task graph, validation/test plan.
- EXCLUDE: Any code changes or file modifications.
