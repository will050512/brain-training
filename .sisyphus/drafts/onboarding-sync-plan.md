# Draft: Onboarding prompt flash + auto sync backoff

## Requirements (confirmed)
- Fix onboarding prompt flash; onboarding prompt should not show if previously dismissed.
- Remove manual sync prompts.
- Implement auto sync with 5-fail backoff (20s) or retry on next online.
- Provide plan with parallel task graph, steps, success criteria, test plan.
- Use read-only tools; do not modify files.
- Welcome modal flickers on Home view.
- Dismissal source of truth: either localStorage settings or user settings true => suppress (sync both).
- Remove all manual sync UI (settings sync card button, sync status retry, sync toasts).
- Failure count is global across all sync operations.
- Backoff behavior: after 5 consecutive failures, wait 20s then try; if offline, defer until next online (both).

## Technical Decisions
- Onboarding prompt gating should rely on settingsStore.hasSeenWelcome plus persisted user settings; ensure both are kept in sync.
- Global sync failure counter should live in a shared sync coordinator (likely offlineSyncService) and be incremented by all sync operations.
- Backoff scheduling should respect online/offline events; retry after 20s when online, or at next online if offline.

## Research Findings
- Onboarding prompt display: `src/components/views/HomeViewContent.vue` shows welcome overlay when `!settingsStore.hasSeenWelcome`.
- Dismissal persistence: `src/stores/settingsStore.ts` stores `hasSeenWelcome` in localStorage; `userStore.markWelcomeSeen()` sets it true.
- Sync UI: `src/components/ui/SyncStatusIndicator.vue` shows error click to retry via `dataInitService.retrySync()`; `SettingsSyncCard.vue` includes manual sync button and “manual sync” labels.
- Auto sync: `src/services/offlineSyncService.ts` has `startAutoSync()` interval and online/offline listeners; uses `sync()` with `maxRetries`, `retryInterval` defaults.
- App-level sync toast: `src/App.vue` shows sync toast when syncStatus is syncing/error.
- Settings view wiring: `src/components/views/SettingsViewContent.vue` exposes `canManualSync` + `handleManualSync` to SettingsSyncCard.
- LSP diagnostics unavailable (typescript-language-server not found).

## Open Questions
- None (clarified by user).

## Scope Boundaries
- INCLUDE: onboarding prompt gating, sync retry policy, remove manual sync prompts UI
- EXCLUDE: unrelated UI refactors, data model changes, PWA updates
