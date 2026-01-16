# Design System

This project uses a token-driven UI system defined in `src/style.css`. The goal is consistent, accessible UI that scales across games, reports, and onboarding flows.

## Core Tokens

All tokens live under `:root` and are consumed via CSS variables.

- **Color**: `--color-bg`, `--color-surface`, `--color-primary`, `--color-text`, `--color-border`
- **Typography**: base sizes and weights are driven by component classes; use existing utility classes where possible.
- **Radius**: cards and buttons default to rounded-2xl/rounded-xl for a friendly feel.
- **Shadow**: use soft, layered shadows for depth without heavy contrast.

## Components

Start with the base UI components under `src/components/ui` before creating new ones.

- `BaseButton.vue` for all primary CTAs and controls.
- The `.btn` utility classes in `src/style.css` are also used across views; keep them in sync with `BaseButton.vue` styling.
- `BaseCard.vue` for containers and stat blocks.
- `BaseInput.vue` for form fields with labels, hints, and errors.
- `LoadingSpinner.vue`, `ToastNotification.vue` for feedback.
- `SyncStatusIndicator.vue` for sync status (header/sidebar/icon).

## Layout & Spacing

- Prefer `container` + `section-stack` patterns used in existing views.
- Maintain generous padding on touch targets (min 44px height).
- Use `gap-*` utilities to preserve readable spacing in dense screens.

## Motion

Animation should be purposeful:

- Entry: gentle fade/slide for panels and modals.
- Feedback: short scale or glow to highlight success/fail.
- Avoid constant looping unless conveying state (loading, timer).

## Accessibility

- Maintain contrast in text and buttons.
- Provide clear disabled states.
- Use a minimum 16px text size for core content.

## Adding New Components

1. Start with the smallest atomic component in `src/components/ui`.
2. Wire tokens via `var(--color-*)`.
3. Add a Storybook story under `src/stories`.
4. Use the component in view/layout modules.
