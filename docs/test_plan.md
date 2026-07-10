# Test Plan – Codex KPI Card

## 1. Functional Tests
- [ ] Visual loads without errors
- [ ] Visual renders with sample data
- [ ] Visual handles empty data gracefully
- [ ] All format pane options apply correctly
- [ ] Selection / cross-filter works (if applicable)
- [ ] Tooltips appear on hover

## 2. Performance Tests
- [ ] update() completes < 250ms
- [ ] No memory leaks
- [ ] Bundle size < 2.5 MB

## 3. Accessibility Tests
- [ ] Keyboard navigation works
- [ ] High contrast mode supported
- [ ] ARIA labels present
- [ ] No flashing content

## 4. Security Tests
- [ ] No external network calls
- [ ] No telemetry
- [ ] No external scripts or fonts
- [ ] No DOM escape or eval

## 5. Packaging Tests
- [ ] pbiviz builds successfully
- [ ] Bundle size < 2.5 MB
- [ ] capabilities.json valid

## 6. Sample PBIX Verification
- [ ] Demonstrates all features
- [ ] Demonstrates formatting options
- [ ] Demonstrates interactions

## 7. Background Transparency (TRANS-01, Phase 1 Plan 03 pilot)
- [ ] Format pane → Background card: set a non-white colour, drag Transparency 0 → 50 → 100 over a NON-WHITE report canvas
- [ ] Transparency 0%: card renders fully opaque
- [ ] Transparency 50%: card blends visibly with the canvas behind it, no opaque halo/box around the visual edges
- [ ] Transparency 100%: canvas shows through cleanly, card content (value/label) remains legible
- [ ] Repeat on both light and dark report themes — selection/highlight chrome stays legible on both
- [ ] An old saved .pbix (pre-upgrade, Background properties absent) renders fully opaque/unchanged — no regression

## 8. Conditional Formatting / fx (TRANS-04, Phase 1 Plan 03 pilot)
- [ ] Value Colour swatch (Value Format card) shows a working fx button in the format pane
- [ ] Bind a measure, open the fx rule editor, set a rule (e.g. gradient by value)
- [ ] Card's value text colour changes according to the rule as the bound measure's value changes
- [ ] Removing the rule reverts to the static Value Colour swatch setting

## 9. Visual Title — show/hide, font, alignment (TEXT-01/02, TITLE-01, Phase 1 Plan 10 pilot — now via _shared v2)
- [ ] Format pane → Visual Title card: Show Title toggle is OFF by default; no title renders and no layout shift occurs
- [ ] Toggle Show Title on with Title Text blank: no title renders (both showTitle AND titleText must be truthy per the render gate)
- [ ] Set Title Text with Show Title on: title renders inside the visual's own iframe (not the host chrome title bar)
- [ ] Font Family / Font Size / Bold / Italic / Underline (Font composite) all apply to the rendered title
- [ ] Alignment (left/center/right) moves the title's flex position (alignSelf) and text alignment (textAlign) together
- [ ] Font Color swatch changes the rendered title colour
- [ ] An old saved .pbix (pre-upgrade, titleSettings properties absent) renders with no title — pixel-identical to before this change (render-nothing default, D-06/D-14)

## 10. Visual Title — conditional formatting (fx)
- [ ] Font Color swatch (Visual Title card) shows a working fx button in the format pane (instanceKind ConstantOrRule)
- [ ] Bind a measure, set a colour rule, confirm the fx button is present (static resolution proven via the shared Value Colour pattern; per-rule visual verification pending Power BI Desktop sideload)

## 11. _shared v2 cross-directory import proof (D-10 re-proof)
- [ ] `npx pbiviz package` exits 0 with settings.ts importing TitleSettings + alignment helpers from `../../_shared/formatting/` (no inline duplicates remaining)
- [ ] Resulting `.pbiviz` sideloads and renders identically to the pre-refactor build for all existing (non-title) formatting cards

## 12. v2 board look — _shared v3 appearance engine pilot (LOOK-01, Phase 1 Plan 15)
- [ ] Card renders the v2 look: corner-bracket signature (band-tinted L, top-left + bottom-right mirror), eyebrow label + status dot header row, footer row (change pill + subtitle), quantised 10-segment target strip below the footer
- [ ] Band-engine tint — success: bind a Change Value that reads as "good" under the current Direction Logic setting (default Down is Good ⇒ a negative Change Value) — dot, pill, corner bracket, and lit strip segments all share ONE lime/green colour token
- [ ] Band-engine tint — danger: flip the sign of the bound Change Value (or set Direction Logic to Up is Good with a negative value) — the same four elements re-tint to ONE magenta/red token together
- [ ] Direction Logic = Neutral: pill reverts to the pre-existing neutral grey treatment (unchanged from v1); corner bracket/dot fall back to the Accent Colour swatch, not a band colour
- [ ] No Change Value bound: corner bracket/dot/strip fall back to the Accent Colour swatch (existing property still visibly matters) and the strip reads fully lit
- [ ] Corner brackets sit above the Visual Title panel — enable Show Title and confirm the bracket is not chopped by the title bar
- [ ] Tabular numerals: Value and Change Pill text keep digits aligned (`font-feature-settings:"tnum"`) — visually confirm digit widths are uniform
- [ ] Motion-once: change the bound Value between two different numbers across two `update()` cycles — the value settles (brief fade/slide-in) exactly once per change, does not loop, and does not replay when the same value is re-rendered unchanged
- [ ] Reduced motion: with the OS "prefers reduced motion" setting enabled, the value settle animation does not play (value still updates instantly, correctly)
- [ ] High contrast: enable Windows High Contrast — dot/corner-bracket/strip glow all drop to none, colours map to the system foreground/background slots, card border thickens to 2px, and the change pill's arrow is preceded by a status glyph (✓/✕) so the good/bad reading does not depend on colour alone
- [ ] Selection ring: with a Category bound, click the card to select it — a 1px cyan hairline + soft glow ring appears around the card; clicking elsewhere (or ctrl-click to deselect) removes it; ring does not render under High Contrast
- [ ] `npx pbiviz package` exits 0; `_shared/formatting/` v1 (backgroundSettings.ts, colorHelpers.ts, textFormatting.ts, titleSettings.ts, backgroundObject.json, titleObject.json) confirmed byte-unchanged via `git diff --quiet`

## 13. D-16 — new default look vs. saved-report fidelity (Phase 1 Plan 15)
- [ ] New default row: a report saved with THIS version's defaults (Corner bracket signature, quantised strip, band-tinted pill) shows the redesigned v2 look — this is the intended default-look CHANGE, not a regression
- [ ] User-override-honoured row: a report with a custom Accent Colour AND/OR Background Colour AND/OR a Value Colour fx rule set BEFORE this change still resolves those exact values after upgrading — Accent Colour still drives the no-band fallback tint, Background Colour still resolves through `toRgba()`, and the Value Colour fx rule still recomputes per-instance via `ColorHelper.getColorForMeasure` — none of the three are silently discarded by the new corner-bracket/band-engine chrome