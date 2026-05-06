# Developer Guide: optiStockKpiCard

## Architecture
The visual follows a standard Power BI custom visual structure:
- **src/visual.ts**: Main visual class implementing `IVisual`.
- **src/settings.ts**: Formatting settings model and helper functions (`alignSelfFor`, `textAlignFor`).
- **src/utils.ts**: Utility constants (CODEX_TOKENS for color themes).
- **style/visual.less**: Stylesheet for the visual (though the visual primarily uses inline styles via DOM API).
- **capabilities.json**: Defines data roles, objects (formatting pane), and capabilities.
- **pbiviz.json**: Manifest file with metadata, dependencies, and asset references.

### Rendering Model
The visual constructs a static DOM skeleton in the constructor and updates it in the `update` method:
1. **Constructor**: Creates the container and child elements (title, label, value, subtitle, pill) using `document.createElement`. Sets up event listeners for context menu, click (for filtering), and tooltip (mousemove/mouseleave).
2. **Update Method**:
   - Parses the `DataView` into a `ParsedCard` interface.
   - Applies formatting settings from the format pane.
   - Updates text content and styles of each element based on data and formatting.
   - Handles high contrast mode by adjusting colors.
   - Manages the change pill display based on `showChange` and `changeValue`.
   - Builds tooltip data for hover tooltips.
   - Manages selection ID for click-to-filter (when Category is bound).

## capabilities.json Summary
- **Data Roles**: 8 roles (Category, Value, Label, Subtitle, Change Value, Change Label, Accent Colour, Text Colour). Category is Grouping; others are Measure. All have a max of 1 except Category (max 1). Change Value and Accent Colour/Text Colour have type restrictions (numeric/text).
- **Objects**: 6 formatting objects (titleSettings, cardStyle, valueFormat, changeSettings, labelStyle, subtitleStyle) with properties for fonts, colors, alignment, etc.
- **Capabilities**: Supports highlight, keyboard focus, landing page, empty data view, multi-visual selection, and tooltips (default and canvas).
- **Data View Mapping**: Single table mapping with rows selecting all 8 roles.

## APIs Used
- **Selection Manager (`ISelectionManager`)**: For click-to-filter (1180.2.2.3) and context menus.
- **Tooltip Service (`ITooltipService`)**: For showing/hiding tooltips on hover.
- **Event Service (`IVisualEventService`)**: For rendering started/finished notifications.
- **Localization Manager (`ILocalizationManager`)**: For localization support (though not used in the current source).
- **Host Color Palette**: For high contrast mode detection and foreground color.
- **Formatting Settings Service**: To populate the formatting model from the dataView.
- **Selection ID Builder (`host.createSelectionIdBuilder()`)**: To create selection IDs for filtering.

## Performance Considerations
- The visual processes only the first row of the dataView (if multiple rows exist, only the first is used).
- DOM updates are efficient: only text content and styles are changed; no element recreation.
- Responsive font scaling is viewport-width based and only adjusts when width < 200px.
- No expensive computations or loops in the render loop.
- The visual does not load external resources or make network calls.

## Accessibility Implementation
- **Keyboard Navigation**: The visual is focusable (supportsKeyboardFocus: true). Click and context menu events are attached to the container, which can be activated via Enter/Space (click) and Shift+F10 (context menu) when focused.
- **High Contrast Mode**: Uses `host.colorPalette.isHighContrast` to adjust text colors to foreground and set pill background to transparent.
- **Screen Reader Support**: All text is set via `textContent`, making it accessible. The visual does not use ARIA because the text content is sufficient and the structure is simple.
- **Color Usage**: The change pill uses both color and an arrow symbol (▲, ▼, →) to convey information without relying solely on color.
- **Text Scaling**: Font sizes are set in `pt` units, respecting user settings. Responsive scaling only reduces size in narrow viewports to prevent overflow.

## Security Compliance
- **No External Calls**: The visual does not make any network requests. `externalJS` is null in pbiviz.json.
- **No Telemetry**: No data collection or transmission.
- **Safe DOM**: Uses `textContent` and DOM API methods; no `innerHTML` or `eval`.
- **Dependencies**: Only uses `powerbi-visuals-api` and `powerbi-visuals-utils-formattingmodel`.
- **Permissions**: No additional privileges requested (`privileges` array is empty).

## Build & Packaging
- The visual is built using standard Power BI visual tooling (e.g., `pbiviz`).
- Source files are compiled (if using TypeScript) and bundled into the `dist` folder.
- The `pbiviz.json` references the compiled `visual.js` (or `visual.min.js`) and the Less stylesheet.
- To package: `pbiviz package` (assuming the project is set up with the Power BI visual tools).
- The resulting `.pbiviz` file can be imported into Power BI Desktop or published to AppSource.