# Design System / 設計系統

This project uses a token-driven UI system defined in `src/style.css`. The goal is consistent, accessible UI that scales across games, reports, and onboarding flows.
本專案使用 `src/style.css` 的 token 驅動 UI 系統，目標是跨遊戲、報告與引導流程的一致且可近用介面。

## Core Tokens / 核心 Tokens

All tokens live under `:root` and are consumed via CSS variables.
所有 tokens 定義於 `:root`，透過 CSS 變數使用。

- **Color**: `--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--color-border`
- **Typography**: base sizes and weights are driven by component classes; use existing utility classes where possible.
- **Radius**: cards and buttons default to rounded-2xl/rounded-xl for a friendly feel.
- **Shadow**: use soft, layered shadows for depth without heavy contrast.

- **色彩**：`--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--color-border`
- **字體**：基礎尺寸與字重由元件 class 控制，優先使用既有工具類別。
- **圓角**：卡片/按鈕預設 rounded-2xl/rounded-xl。
- **陰影**：柔和層次，不要過度對比。

## Components / 元件

Start with the base UI components under `src/components/ui` before creating new ones.
建立新元件前，先從 `src/components/ui` 的基礎元件開始。

- `BaseButton.vue` for all primary CTAs and controls.
- The `.btn` utility classes in `src/style.css` are also used across views; keep them in sync with `BaseButton.vue` styling.
- `BaseCard.vue` for containers and stat blocks.
- `BaseInput.vue` for form fields with labels, hints, and errors.
- `LoadingSpinner.vue`, `ToastNotification.vue` for feedback.
- `SyncStatusIndicator.vue` for sync status (header/sidebar/icon).

- `BaseButton.vue`：主要 CTA 與控制元件。
- `src/style.css` 的 `.btn` 工具類別會被多處使用，需與 `BaseButton.vue` 同步。
- `BaseCard.vue`：容器/統計區塊。
- `BaseInput.vue`：表單欄位。
- `LoadingSpinner.vue`, `ToastNotification.vue`：回饋提示。
- `SyncStatusIndicator.vue`：同步狀態。

## Layout & Spacing / 版面與間距

- Prefer `container` + `section-stack` patterns used in existing views.
- Maintain generous padding on touch targets (min 44px height).
- Use `gap-*` utilities to preserve readable spacing in dense screens.

- 盡量沿用現有 `container` + `section-stack` 版面模式。
- 觸控目標至少 44px。
- 使用 `gap-*` 維持可讀性。

## Motion / 動效

Animation should be purposeful:

- Entry: gentle fade/slide for panels and modals.
- Feedback: short scale or glow to highlight success/fail.
- Avoid constant looping unless conveying state (loading, timer).

動效需有目的：

- 進場：輕柔 fade/slide。
- 回饋：短暫 scale/glow。
- 避免不斷循環（除非為狀態指示）。

## Accessibility / 可近用性

- Maintain contrast in text and buttons.
- Provide clear disabled states.
- Use a minimum 16px text size for core content.

- 確保文字/按鈕對比。
- 明確 disabled 狀態。
- 核心內容字體至少 16px。

## Adding New Components / 新增元件流程

1. Start with the smallest atomic component in `src/components/ui`.
2. Wire tokens via `var(--color-*)`.
3. Add a Storybook story under `src/stories`.
4. Use the component in view/layout modules.

1. 從最小可重用元件開始（`src/components/ui`）。
2. 透過 `var(--color-*)` 對接 tokens。
3. 在 `src/stories` 加入 Storybook。
4. 在 view/layout 中使用。
