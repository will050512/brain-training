# Draft: Load gate/white screen on refresh

## Requirements (confirmed)
- Produce a precise plan to fix persistent load gate/white screen and long load times after refresh across PWA and browsers.
- Include step-by-step plan, required files, success criteria, test plan, ambiguities to resolve.
- Use current repo context and user report: issue persists even on latest; shows “loading data” and white screen; PWA/mobile/desktop browsers affected.
- No code changes (planning only).
- Ask for logs needed.

## Technical Decisions
- Pending (need repo-specific file references for load gate, bootstrap, router guards, PWA update flow, and loading state).

## Research Findings
- Project context (from AGENTS.md): Vue 3 + Vite + PWA; app bootstrap in src/main.ts; router/guards in src/router/index.ts; PWA flow in vite.config.ts and src/composables/usePWA.ts; data layer in src/services/db.ts; sync in src/services/googleSheetSyncService.ts.
- Explore agent for code patterns failed; retry needed.

## Open Questions
- What exact logs can you provide (console/network/service worker) for the white screen and “loading data” state?
- Do you have reproduction steps and timing (first load vs refresh, offline/online, after update prompt)?
- Is there a specific route or screen where it happens, or global app shell?

## Scope Boundaries
- INCLUDE: PWA update gating, app bootstrap, router guards, loading state, data load/sync, service worker caching/manifest, refresh behavior.
- EXCLUDE: unrelated feature changes; non-PWA platforms; UI redesign.
