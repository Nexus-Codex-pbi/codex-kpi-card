# Security Statement for optiStockKpiCard

## External Network Access
The visual does not make any external network calls. It does not use `fetch`, `XMLHttpRequest`, or any other communication APIs. The `externalJS` section in `pbiviz.json` is null, confirming no external JavaScript is loaded.

## Telemetry
The visual does not implement any telemetry or data collection mechanisms. It does not send usage data to any external or internal endpoints.

## Data Handling
The visual only processes data passed to it via the Power BI data view. It does not store, cache, or persist any data beyond the lifetime of the visual instance. All data is held in memory and released when the visual is destroyed or updated.

## Script Safety
The visual does not use `eval()`, `Function()`, `setTimeout()` with string arguments, or `setInterval()` with string arguments. All DOM manipulation is performed via safe methods: `createElement`, `appendChild`, `textContent`, and `setAttribute`. The visual avoids `innerHTML` except for setting text content via `textContent`.

## Cross-Visual Interaction
The visual supports highlighting and cross-filtering:
- When a **Category** field is bound, clicking the card emits a selection event that filters other visuals on the report page by that category (using `ISelectionManager.select`).
- Without a bound Category, clicking the card is a no-op, matching the behavior of the built-in KPI visual.
- The visual also supports context menus (right-click) via `selectionManager.showContextMenu`.

## Dependencies
The visual relies only on the following approved Power BI dependencies:
- `powerbi-visuals-api`
- `powerbi-visuals-utils-formattingmodel`
No additional libraries or dependencies are included.

## Permissions
The visual does not request any special privileges. The `privileges` array in `capabilities.json` is empty.

## Summary
optiStockKpiCard is a secure, self-contained Power BI visual that adheres to Microsoft's security guidelines for custom visuals. It performs no external communication, telemetry, or data storage, and uses only safe DOM APIs for rendering.