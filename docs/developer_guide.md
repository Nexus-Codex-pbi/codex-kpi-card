# Developer Guide – Codex KPI Card

## 1. Architecture
- File structure: `src/visual.ts`, `src/settings.ts`, `style/visual.less`, `capabilities.json`, `pbiviz.json`
- Rendering model: DOM built once in constructor; `update()` mutates only existing elements.

## 2. Capabilities
- Data roles: 
  - category (Grouping, optional)
  - value (Measure, required)
  - label (Measure, optional)
  - subtitle (Measure, optional)
  - changeValue (Measure, optional, numeric)
  - changeLabel (Measure, optional)
  - accentColour (Measure, optional, text)
  - textColour (Measure, optional, text)
- Format pane cards: titleSettings, cardStyle, valueFormat, changeSettings, labelStyle, subtitleStyle
- supportsHighlight, supportsKeyboardFocus, supportsLandingPage, supportsEmptyDataView, supportsMultiVisualSelection: all true.

## 3. APIs Used
- ISelectionManager — cross-filter + context menu
- ITooltipService — hover tooltips
- ILocalizationManager — string resources
- ISandboxExtendedColorPalette — high-contrast detection

## 4. Performance
- update() target: < 250ms
- No infinite loops or heavy timers
- DOM minimal — element refs cached on construction

## 5. Accessibility
- ARIA labels on interactive elements (context menu and click actions)
- High contrast support via `colorPalette.isHighContrast` (foreground/background colours adapt)
- Keyboard focus on tabbable elements (container is focusable and handles Enter/Space for click, Shift+F10 for context menu)

## 6. Security
- No external calls
- No telemetry
- No external scripts or fonts
- No `eval()` or dynamic code

## 7. Build & Packaging
- powerbi-visuals-tools 7.x
- Node 20
- TypeScript 5.5+
- `npm install && pbiviz package`
- Output: `.pbiviz` < 2.5 MB