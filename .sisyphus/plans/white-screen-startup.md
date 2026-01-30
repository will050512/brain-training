# Diagnose 20s White Screen on Startup (Vue 3 + Vite PWA)

## TL;DR

> **Quick Summary**: Investigate the 20s startup white screen by parallelizing inspection of boot gates, async bootstrap tasks, data sync/restore paths, router guards, and PWA update flow. Use evidence from code paths and runtime timing to confirm which step blocks rendering. 
>
> **Deliverables**:
> - Parallel investigation graph with steps, hypotheses, and file targets
> - Evidence-based fix options (only after validation)
> - Success criteria and test plan template
> - Questions for user to fill critical gaps
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Instrument startup timing → identify blocking step → validate hypothesis → propose fix options

---

## Context

### Original Request
Create a parallel investigation plan to diagnose 20s white screen on app startup (PWA/browser), and propose solution options. Provide steps, specific files to inspect, hypotheses to validate, potential fixes. Must include success criteria, test plan template, and questions to ask user if needed. Must use Read, Grep, Glob, LSP diagnostics. Must not modify files or suggest speculative fixes without evidence.

### Interview Summary
- Must be plan-only (no modifications).
- Use repository evidence from Read/Grep/Glob.
- LSP diagnostics tool is required but may be unavailable in environment (note as limitation in plan).

### Evidence From Code Inspection
- **Bootstrap before mount** in `src/main.ts`: `initDatabase()`, `initMigrations()`, `dataInitService.initialize()`, optional `userStore.quickLogin()`, and `registerAllGames()` all occur **before** `app.mount('#app')`. (lines 39–73)
- **Load gate** in `src/App.vue`: `bootGateState` and `refreshGateState` control a full-screen loading overlay; `bootGateState` is set to `loading` on mount and becomes `ready` **after** `dataInitService.initialize()` completes. (lines ~56–92, 260–289)
- **Data init/sync pipeline** in `src/services/dataInitService.ts`: restore/sync paths call `restoreUserDeltaFromSheet` / `restoreAllUserDataFromSheet` + `gameStore.loadUserSessions()` + `loadDailyTraining()` + `syncAssessmentStatus()` + backfills; sync status updated throughout. (lines 57–229)
- **Router guards** in `src/router/index.ts` rely on `localStorage` for auth and assessment completion; can redirect to Login/Assessment on boot. (lines 49–92)
- **PWA update flow** in `src/composables/usePWA.ts` and `src/sw.ts` with controllerchange-triggered reload after `__APP_BOOT_READY__` is true. (usePWA lines ~187–244; sw.ts lines ~100–129)
- **Offline sync service** `src/services/offlineSyncService.ts` runs `sync()` on network online events and can update UI status; long sync cycles may overlap startup but should not block mount unless called awaited. 
- `docs/pwa-update-fix.md` documents prior update-gate issues and how they were resolved (useful for verifying update-gate regressions).

---

## Work Objectives

### Core Objective
Identify which startup step causes the consistent ~20s white screen and provide validated, evidence-based fix options without modifying code.

### Concrete Deliverables
- Parallel investigation task graph (with dependencies)
- Hypotheses list tied to specific files and observable signals
- Evidence-based fix options (only after validation)
- Success criteria and test plan template
- Questions for user to provide missing runtime context

### Must Have
- Use Read/Grep/Glob/LSP diagnostics (note limitations if LSP unavailable)
- Focus on startup flow, gating, data sync, PWA update and router guard interactions
- Provide explicit files to inspect

### Must NOT Have (Guardrails)
- No file modifications or implementation steps
- No speculative fixes without evidence
- No assumptions about user environment without confirmation

---

## Verification Strategy (Manual + Instrumentation Plan)

> There is no instruction to add tests now. For diagnosis, the plan uses runtime observation (logs/timing), browser devtools, and PWA inspection. Provide a template for tests to be added later if needed.

### Test Plan Template (for later execution)
**Goal**: Verify that startup render time improves and white screen is eliminated.

1. **Baseline Measurement**
   - Record time from navigation start to first meaningful paint / app mount.
   - Capture console logs and network timings during startup.
2. **Hypothesis Validation**
   - For each suspected step (DB init, migration, sync, PWA update), collect timing evidence.
3. **Post-fix Verification**
   - Repeat baseline measurement after fix.
4. **Regression Checks**
   - Ensure app still loads in offline mode and after PWA update.

---

## Execution Strategy

### Parallel Execution Waves

**Wave 1 (Immediate — gather blocking evidence)**
- Task 1: Map startup gates & mount path (main.ts + App.vue)
- Task 2: Map sync/restore path timing risks (dataInitService + offlineSyncService)
- Task 3: PWA update flow & service worker interaction (usePWA + sw.ts + docs)

**Wave 2 (After Wave 1)**
- Task 4: Router guards & redirect effects on boot
- Task 5: DB init/migrations footprint and possible long operations

**Wave 3 (After Wave 2)**
- Task 6: Consolidate evidence & propose validated fix options

**Critical Path**: Task 1 → Task 2 → Task 6

---

## TODOs

> All tasks are investigation-only. No edits.

### 1) Map Boot Gates and Mount Path

**What to do**:
- Inspect `src/main.ts` for all awaited operations before `app.mount('#app')` and annotate those as potential blockers.
- Inspect `src/App.vue` `bootGateState` and `showLoadGate` conditions; record gate transitions and dependencies.

**Hypotheses to validate**:
- `app.mount` is delayed by awaited init steps (DB/migrations/sync).
- Load gate is visible because `bootGateState` remains `loading` until `dataInitService.initialize()` completes.

**References**:
- `src/main.ts:39-73` — await chain before mount
- `src/App.vue:56-92, 260-289` — load gate and boot state

**Acceptance Criteria**:
- Clear list of pre-mount awaited steps and their order.
- Gate conditions documented with exact state transitions.

---

### 2) Analyze Data Sync & Restore Pipeline

**What to do**:
- Inspect `src/services/dataInitService.ts` for any blocking network calls or restore paths during startup.
- Identify which calls are awaited vs background and whether they can stall `bootGateState` or `app.mount`.

**Hypotheses to validate**:
- `restoreUserDeltaFromSheet` / `restoreAllUserDataFromSheet` is slow and blocks UI.
- `gameStore.loadUserSessions()` / `loadDailyTraining()` adds DB load before ready.

**References**:
- `src/services/dataInitService.ts:78-145, 192-229` — sync/restore paths
- `src/stores/userStore.ts` (login & init user data paths, via grep results)

**Acceptance Criteria**:
- Identify which call chain is awaited during startup and can plausibly take ~20s.
- Evidence for which path is taken in the reported scenario (e.g., delta vs full restore).

---

### 3) Inspect PWA Update and Service Worker Interactions

**What to do**:
- Inspect `src/composables/usePWA.ts` and `src/sw.ts` for any update flow that could block rendering or trigger reload loops.
- Cross-check with `docs/pwa-update-fix.md` for known prior issues.

**Hypotheses to validate**:
- Update gate shows (full-screen overlay) during `isUpdating` and may stall UI.
- `controllerchange` reload waits for `__APP_BOOT_READY__`; if boot stuck, reload may be delayed or repeated.

**References**:
- `src/composables/usePWA.ts:118-244` — update workflow + controllerchange
- `src/sw.ts:100-129` — build hash persistence and message handling
- `docs/pwa-update-fix.md` — previous update gating fixes

**Acceptance Criteria**:
- Document whether PWA update flow can block UI without user action.
- Identify any waiting loops or timing conditions that match ~20s.

---

### 4) Inspect Router Guards for Redirect Loops/Delays

**What to do**:
- Inspect `src/router/index.ts` guards and localStorage keys for auth/assessment.
- Validate if guard logic could repeatedly redirect during startup or await data that isn’t ready.

**Hypotheses to validate**:
- Guard checks mismatch with actual userStore state or session restore timing causing transient blank view.

**References**:
- `src/router/index.ts:49-92` — guard logic
- `src/main.ts:59-65` — restore session logic pre-mount

**Acceptance Criteria**:
- Clear determination of whether guards can cause blank screen transitions or loops on startup.

---

### 5) Review DB Init and Migration Weight

**What to do**:
- Inspect `src/services/db.ts` and `src/services/migrationService.ts` for potential heavy loops (e.g., reading all sessions, rewriting records).

**Hypotheses to validate**:
- Migration work (e.g., iterating all sessions) could be large and synchronous enough to slow startup.

**References**:
- `src/services/db.ts:227-333` — DB init and upgrade
- `src/services/migrationService.ts:55-160, 165-256` — migrations and potential heavy loops

**Acceptance Criteria**:
- Identify any O(N) operations that would scale with user data and may explain 20s delays.

---

### 6) Consolidate Evidence & Propose Fix Options

**What to do**:
- Based on validated timing evidence, list fix options tied to specific bottlenecks.
- Provide options only after evidence; each fix must reference the exact blocking step.

**Hypotheses to validate**:
- White screen is caused by a specific awaited init step (DB/migrations/sync) or load gate waiting.

**Acceptance Criteria**:
- Each proposed fix has explicit evidence linking it to the root cause.
- No speculative fixes.

---

## Success Criteria

- Root cause for the 20s white screen is narrowed to a specific blocking step or gate condition.
- Each hypothesis has a validation method and evidence.
- Fix options are tied to validated cause(s) with references.
- Plan includes explicit questions for missing runtime context.

---

## Questions for User (needed to complete diagnosis)

1. **Environment**: Is the issue reproducible in PWA installed mode, normal browser tab, or both? Which browsers/devices?
2. **Network conditions**: Does the 20s delay happen offline or only online (e.g., when sync is available)?
3. **Logs**: Are there console warnings/errors during the white screen? Any long network requests?
4. **Timing**: Does the delay correspond to any visible UI (e.g., load gate text), or is it a blank white page with no overlay?
5. **User state**: Does it happen only when a user is logged in, or also on a fresh user (no localStorage user)?

---

## Constraints & Limitations

- LSP diagnostics is required but may not run if TypeScript language server is unavailable. If LSP cannot be used, note as limitation and proceed with Read/Grep/Glob evidence.
- No file modifications allowed.
