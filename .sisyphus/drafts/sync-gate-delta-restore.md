# Draft: Sync Gate Removal & Delta-by-Default Restore

## Requirements (confirmed)
- Remove focus/online load gate overlay; no UX disruption (no flashing/white screens) across PWA/mobile/desktop.
- Run background sync with small non-blocking indicator only (use existing SyncStatusIndicator).
- Change restore strategy to delta-by-default; full restore only when: (A) no last sync stamp, (B) schema/version mismatch, (D) delta failures N times.
- Delta covers all data and runs on focus/online in background with no overlay.
- Add automated tests; run build/test.

## Technical Decisions
- Pending: define N for delta failure threshold; decide schema/version mismatch detection source.
- Pending: whether default init mode should be "delta" vs "fast" (snapshot then background full).
- Pending: define authoritative initialization flow to avoid duplicates (main.ts vs App.vue vs userStore).

## Research Findings
- Pending: codebase patterns for App.vue gating & sync indicator.
- Pending: best practices for background sync UX + delta/full restore guardrails.

## Open Questions
- What is N for delta failure fallback to full restore?
- How should schema/version mismatch be detected (DB schema version, app version, migration mismatch, sheet schema)?
- Should init default be delta or fast? If fast, what stays in background?
- Which initialization path should be authoritative to remove duplicates?
- Test preference: TDD vs tests-after (you asked for automated tests; confirm order)?
- Any specific acceptance criteria for sync indicator UI (location, text, animation)?

## Scope Boundaries
- INCLUDE: App.vue load gate removal for focus/online refresh; dataInitService/sheetRestoreService logic for delta/full selection; failure tracking; sync indicator usage; tests; build/test commands.
- EXCLUDE: visual redesigns beyond small indicator; heavy refactors; editing build artifacts.
