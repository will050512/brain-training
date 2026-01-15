# UX Replan (Draft)

## Goals
- Reduce visual clutter by grouping content into consistent sections.
- Align mobile and desktop with the same information hierarchy.
- Make report pages readable in long sessions and export clean PDFs.
- Support external profile login flows with clear UI cues.

## Information Architecture
1) Home (Dashboard)
   - Alerts and reminders
   - Today focus (daily goal + quick start)
   - Weekly progress
   - Trend snapshot
   - Quick actions
2) Training
   - Game select
   - Daily challenge
3) Assessment
   - Mini-Cog and assessment results
4) Reports
   - Summary
   - Trend + correlations
   - Mini-Cog details
   - Nutrition insights
5) Settings / Profile
   - Account source + device
   - Preferences

## Layout System
- Use a consistent section heading pattern: muted small heading + card block.
- Prefer stacked sections with short scan lines on mobile.
- Maintain a single source of truth for key metrics (avoid duplicates).
- Keep top actions sticky or primary in each view.

## PDF Report Principles
- Wrap text by column width and compute row height dynamically.
- Guard page breaks before large blocks and charts.
- Limit dense tables to the latest 10 items.

## External Profile Flow
- Accept profile via `window.postMessage` (type: `brain-training/external-profile`).
- Normalize birthday to `YYYY-MM-DD`.
- Display login source + client source in Settings.
