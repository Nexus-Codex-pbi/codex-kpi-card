# Codex KPI Card — Cert Notes (resubmission wave, Phase 01)

**Version:** 1.1.0.18 (visual.version) · production GUID unchanged (`codexKpiCard…`) · API 5.11.0 / pbiviz 7.0.2 (pinned).

This is a one-wave AppSource resubmission carrying the suite-wide transparency/formatting rework **and** the v2 appearance redesign. Partner Center re-evaluates the whole package on resubmission (Pitfall 6), so this note documents every change since the last review, not a diff.

## Transparency wave (Plans 03–08)
- New **Background** formatting card: `ColorPicker` fill + 0–100 `transparency` slider, rendered via `hexToRGBString(hex, transparency)` (verified direction, single suite source of truth — no hand-rolled alpha). Additive; saved reports binding `fill` alone are untouched.
- **fx (conditional formatting)** wired on the eligible colour properties via `instanceKind = ConstantOrRule` + `dataViewWildcard` selector + `altConstantValueSelector`.

## Title + per-region text wave (Plans 10–14)
- Title and per-region text treatment reworked (eyebrow label, header/footer rows, subtitle) with adaptive text colour across themes.

## v2 Appearance wave (Plans 15–18) — pilot visual
KPI Card is the **v3 `_shared/formatting/` engine pilot**: corner-bracket card signature above the title panel; header row (eyebrow + band-tinted status dot); footer row (delta pill + subtitle); quantised 10-segment target strip; tabular numerals; value-settle motion; HC-routed colour with status glyphs; cyan selection ring.
- **D-16:** new defaults change the look on purpose, but every pre-existing property (`accentColor`/`accentPosition`/`backgroundColor`/`transparency`/Value Colour fx/`changeDirection`) still resolves exactly as before. The `changeDirection` ("Down is Good") semantics are explicitly preserved — the pill's good/bad meaning is **not** inverted for saved reports.

## High-contrast rule
Single shared HC rule wired (`src/shared/highContrast.ts` consumed): drops glow, uses system colours, shows status glyphs.

## Pending fixes riding this wave
None outstanding beyond the above. (2026-06-11 memory listed KPI Card among "not yet submitted" for the listing-description wave — confirm current Partner Center status before assuming a clean baseline.)
