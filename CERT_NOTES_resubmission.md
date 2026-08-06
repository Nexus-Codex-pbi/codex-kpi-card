# Codex KPI Card — Cert Notes (licensing resubmission wave)

**Version:** 1.1.0.23 (visual.version) · production GUID unchanged (`codexKpiCard…`) · API 5.11.0 / pbiviz 7.0.2 (pinned).

**Review scope — two unreviewed changes.** Verified against the offer's Partner Center History page:
the package submitted 28 Jul 2026 **passed certification and published on 29 Jul 2026**; a 5 Aug
submission was cancelled before review. So the transparency, title/text and v2 appearance waves are
already certified. Unreviewed since 29 Jul: the **1180.2.2 `supportsHighlight` fix** and the
**licence gate**.

## 1. 1180.2.2 cross-filtering (`b97f297`, 30 Jul — unreviewed)

`"supportsHighlight": true` was declared but the visual never read the highlights array, so
cross-filtering from another visual appeared to do nothing. Removed; the host now filters `values[]`
per the documented default. This is the same defect Microsoft rejected on a sibling visual under
rule 1180.2.2 — fixed here before submission rather than after.

## 2. Licensing

- `licenseManager.getAvailableServicePlans()` is called once on construction.
- With no Active/Warning plan, `notifyLicenseRequired(LicenseNotificationType.General)` is raised.
  `General`, **not** `VisualIsBlocked` — Microsoft enforces `General` only in Edit scenarios, so a
  report viewer is never interrupted and the visual keeps rendering. Verified in the built bundle:
  the compiled call is `notifyLicenseRequired(0)`; `VisualIsBlocked` does not appear.
- **Fails open** on `isLicenseInfoAvailable === false`, `isLicenseUnsupportedEnv === true` (Publish
  to Web, PaaS embed, national clouds, Report Server, PDF/PPT export), or an absent API.
- **No network calls added.** Verified in the built bundle: no `fetch`, `XMLHttpRequest`,
  `WebSocket`, no `crypto.subtle` — `src/shared/suiteKey.ts` is imported by nothing and is
  tree-shaken out.

Sample `.pbix` re-embedded to this exact build (1.1.0.23) and verified byte-level before upload.

## Offer listing corrected alongside this submission

The Description carried a standalone bullet, **"Keyboard navigation support"**. It is not
implemented — `src/` has no `keydown`, `keyup`, `tabindex` or `aria` handling anywhere. The bullet is
removed. High contrast **is** implemented (`src/shared/highContrast.ts`) and that claim stays. No
code change; the copy had drifted.

This is the second visual in this wave found carrying the same false keyboard claim (Bullet Chart
was the first; Callback Card's was removed in its 1 Aug listing rewrite) — treat it as a defect
class across the suite's listing copy, not a one-off.

## Already certified — do not re-litigate

- **Transparency wave:** `Background` card — `ColorPicker` fill + 0–100 `transparency` slider via
  `hexToRGBString` (verified direction, single suite source of truth — no hand-rolled alpha).
  Additive; saved reports binding `fill` alone are untouched. fx wired via
  `instanceKind = ConstantOrRule` + `dataViewWildcard` selector + `altConstantValueSelector`.
- **Title + per-region text wave:** eyebrow label, header/footer rows, subtitle, adaptive text
  colour across themes.
- **v2 appearance wave** (KPI Card is the v3 `_shared/formatting/` engine pilot): corner-bracket
  card signature above the title panel; header row (eyebrow + band-tinted status dot); footer row
  (delta pill + subtitle); quantised 10-segment target strip; tabular numerals; value-settle
  motion; HC-routed colour with status glyphs; cyan selection ring.
- **`changeDirection` default corrected to "Up is Good"** (`db3626f`, shipped 1.1.0.20) — the
  shipped default had contradicted the arrow it drew.
- **D-16:** new defaults change the look on purpose, but every pre-existing property
  (`accentColor`, `accentPosition`, `backgroundColor`, `transparency`, Value Colour fx,
  `changeDirection`) still resolves exactly as before. "Down is Good" semantics are preserved — the
  pill's good/bad meaning is **not** inverted for saved reports.
- Shared HC rule (`src/shared/highContrast.ts`): drops glow, uses system colours, shows status
  glyphs.
- eslint 9 → 10 for the `npm audit` gate (`4029895`). devDependencies only.

## Pending fixes riding this wave

None outstanding.
