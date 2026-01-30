# Onboarding welcome flicker fix + global auto-sync backoff

## TL;DR

> **Quick Summary**: Eliminate Home welcome modal flicker by gating with persisted dismissal state, and implement a global sync failure backoff that pauses auto-sync after 5 consecutive failures for 20s (or until next online). Remove all manual sync UI affordances.
>
> **Deliverables**:
> - Stable welcome modal gating based on synced dismissal flags
> - Global sync failure counter + backoff retry policy across all sync operations
> - Manual sync UI removed (Settings sync button, retry click, sync toast)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Sync backoff core → UI wiring cleanup → verification

---

## Context

### Original Request
"Create a plan to fix onboarding prompt flash and implement auto sync with 5-fail backoff (20s) or next online. Remove manual sync prompts."

### Interview Summary
**Key Discussions**:
- Welcome Modal (Home) flickers; suppress if dismissed in local settings OR user settings; keep both in sync.
- Remove all manual sync UI (settings sync button, retry action, sync toasts).
- Global failure count shared across all sync operations.
- Backoff after 5 consecutive failures: wait 20s then retry; if offline, defer until next online.

**Research Findings**:
- Welcome modal gating: `src/components/views/HomeViewContent.vue` uses `showWelcome = !settingsStore.hasSeenWelcome` with `HomeOverlays.vue` rendering `WelcomeModal`.
- Dismissal persistence: `src/stores/settingsStore.ts` stores `hasSeenWelcome` in localStorage; `userStore.markWelcomeSeen()` updates settings.
- Sync flow: `src/services/offlineSyncService.ts` manages online/offline listeners and `startAutoSync()` interval; `dataInitService` sync status drives UI.
- Manual sync UI: `SettingsSyncCard.vue` includes “立即同步” button; `SyncStatusIndicator.vue` retries on error via click; `App.vue` shows sync toast for syncing/error.
- Tests exist (Vitest) in `package.json` and `src/services/__tests__/` for sync policy patterns.

---

## Work Objectives

### Core Objective
Stop Home welcome modal flicker by using stable dismissal state, and enforce a global sync failure backoff with 20s delay after 5 consecutive failures (retry on next online if offline), while removing manual sync UI.

### Concrete Deliverables
- Updated welcome modal gating logic to prevent flicker on Home.
- Shared sync failure tracking and backoff policy across all sync operations.
- Removed manual sync UI elements and error retry interactions.

### Definition of Done
- Welcome modal does **not** appear briefly when dismissal state is already true (no flicker on load).
- After 5 consecutive sync failures, auto-sync pauses for 20s; if offline, it retries upon online event.
- Manual sync controls are absent from Settings sync card, SyncStatusIndicator retry, and App sync toast.

### Must Have
- Global failure count across **all** sync operations.
- Backoff includes both timer and online-trigger retry.

### Must NOT Have (Guardrails)
- No changes to data model or unrelated UI.
- No manual sync entrypoints left in UI.
- Avoid type suppression (`as any`, `@ts-ignore`).

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (Vitest)
- **User wants tests**: Not specified → default to **manual verification** in plan (no new tests required unless you request them).
- **Framework**: vitest (if tests are added later)

### Manual Verification (Agent-Executable)
> Use `npm run dev` with Playwright or scripted checks if available. If automation is not set up, use deterministic local checks via logs/state outputs.

---

## Execution Strategy

### Parallel Execution Waves

**Wave 1 (Start Immediately)**
1. Onboarding dismissal gating analysis and plan (Welcome modal flicker)
2. Sync backoff core design (global failure counter, backoff state machine)

**Wave 2 (After Wave 1)**
3. UI removals (Settings sync button, retry click, App sync toast) and wiring adjustments
4. Verification steps + smoke checks

**Critical Path**: Task 2 → Task 3 → Task 4

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|----------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1,2 | 4 | None |
| 4 | 3 | None | None |

---

## TODOs

> Implementation + Verification = ONE Task. Each task includes references and acceptance criteria.

### 1) Diagnose welcome modal flicker & define gating strategy

**What to do**:
- Identify where `showWelcome` is computed and when `hasSeenWelcome` is loaded from storage.
- Decide gating to prevent early render before settings load (e.g., initialize `hasSeenWelcome` from storage before Home render, or add a "settings ready" gate).
- Define how to sync localStorage + user settings so either true suppresses modal (and keeps both in sync).

**Must NOT do**:
- Do not change unrelated home cards or overlays.

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
  - Reason: Cross-cutting UI + state logic.
- **Skills**: (none required)
  - Omit `frontend-ui-ux` since scope is bug fix, not redesign.

**Parallelization**:
- **Can Run In Parallel**: YES (with Task 2)
- **Parallel Group**: Wave 1
- **Blocks**: Task 3
- **Blocked By**: None

**References**:
- `src/components/views/HomeViewContent.vue` — `showWelcome` computed from `settingsStore.hasSeenWelcome`.
- `src/components/home/HomeOverlays.vue` — `WelcomeModal` rendering point.
- `src/stores/settingsStore.ts` — `hasSeenWelcome` persistence in localStorage and `markWelcomeSeen()`.
- `src/stores/userStore.ts` — `markWelcomeSeen()` usage path.

**Acceptance Criteria**:
- Welcome modal does not appear when dismissal flags already true (no flicker on Home load).
- Dismissal state is derived from both local settings and user settings; setting one true suppresses modal and syncs to the other.

### 2) Design global sync failure tracking + backoff policy

**What to do**:
- Identify all sync entrypoints that can fail (offlineSyncService, user/profile/session syncs, backfills, dataInitService flows).
- Define a shared failure counter accessible to all sync operations.
- Specify backoff behavior: after 5 consecutive failures → wait 20s then retry; if offline, defer until online event.
- Ensure failure count resets on success.

**Must NOT do**:
- Do not remove auto-sync interval unless replacing with backoff-aware scheduling.

**Recommended Agent Profile**:
- **Category**: `unspecified-high`
  - Reason: system-level logic across services.
- **Skills**: (none required)

**Parallelization**:
- **Can Run In Parallel**: YES (with Task 1)
- **Parallel Group**: Wave 1
- **Blocks**: Task 3
- **Blocked By**: None

**References**:
- `src/services/offlineSyncService.ts` — auto sync interval, online/offline listeners, sync() logic.
- `src/services/dataInitService.ts` — sync status integration and retry path.
- `src/services/userSheetSyncService.ts`, `googleSheetSyncService.ts`, `userDataSheetSyncService.ts` — external sync calls that can fail.
- `src/components/ui/SyncStatusIndicator.vue` — current retry action (to be removed).

**Acceptance Criteria**:
- Global failure counter increments for any sync failure, resets on success.
- After 5 consecutive failures, next retry is delayed by 20s; if offline, retry only after online event.

### 3) Remove manual sync UI + adjust sync status UI

**What to do**:
- Remove “立即同步” button from `SettingsSyncCard.vue` and its wiring in `SettingsViewContent.vue`.
- Remove retry click action from `SyncStatusIndicator.vue` (error state should be informational only).
- Remove App-level sync toast in `App.vue` (syncing/error toast).
- Ensure sync status labels remain informative without manual triggers.

**Must NOT do**:
- Do not remove essential sync status visibility in other components unless explicitly asked.

**Recommended Agent Profile**:
- **Category**: `quick`
  - Reason: localized UI removals.
- **Skills**: (none)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2 (depends on Tasks 1 & 2)
- **Blocks**: Task 4
- **Blocked By**: Tasks 1, 2

**References**:
- `src/components/settings/SettingsSyncCard.vue` — manual sync button + labels.
- `src/components/views/SettingsViewContent.vue` — props `canManualSync`, `handleManualSync`, `lastManualSyncError`.
- `src/components/ui/SyncStatusIndicator.vue` — error click handler `dataInitService.retrySync()`.
- `src/App.vue` — sync toast `showSyncToast` block.

**Acceptance Criteria**:
- No manual sync button visible in Settings.
- Sync status indicator no longer clickable for retry.
- No sync toast displayed during syncing/error.

### 4) Verification & smoke checks

**What to do**:
- Validate Home welcome modal no longer flickers when `hasSeenWelcome` already true.
- Simulate 5 consecutive sync failures and verify backoff delay + online retry behavior.
- Confirm removal of manual sync UI elements.

**Recommended Agent Profile**:
- **Category**: `unspecified-low`
  - Reason: verification steps.

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2 (after Task 3)
- **Blocked By**: Task 3

**Acceptance Criteria** (Agent-Executable):
- Launch app (`npm run dev`), open Home route: welcome modal does not appear if dismissal flags set.
- Force 5 sync failures (e.g., mock sync to throw) → observe 20s delay before retry; if offline, retry on online event.
- Settings page shows sync card without manual sync button; SyncStatusIndicator is non-clickable; App sync toast absent.

---

## Commit Strategy

No commits requested.

---

## Success Criteria

- Welcome modal flicker eliminated; suppression honors localStorage OR user settings and keeps them in sync.
- Auto-sync backoff works globally across all sync operations; 5 failures → 20s wait → retry; offline defers until online.
- All manual sync UI removed (Settings button, retry click, sync toast).
