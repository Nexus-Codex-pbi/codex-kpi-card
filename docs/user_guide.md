# User Guide: optiStockKpiCard

## Adding the Visual
1. In Power BI Desktop, navigate to the Visualizations pane.
2. Click the three dots (⋯) and select "Get more visuals".
3. Search for "optiStockKpiCard" or "Codex KPI Card".
4. Select the visual and click "Add".
5. The visual icon will appear in the Visualizations pane. Click it to add an instance to your report.

## Data Binding
The visual supports the following data fields (drag fields from the Fields pane to these wells):

| Field Name | Type | Required? | Description |
|------------|------|-----------|-------------|
| Category | Grouping | Optional | Used for grouping. When bound, clicking the card filters other visuals by this category. |
| Value | Measure | Yes (at least one of Value, Label, Subtitle, Change Value, Accent Colour, or Text Colour must be bound) | Primary metric to display (e.g., 23, 87.3%, $14,100, 5RSOUTH). |
| Label | Measure | Optional | Title text above the value (e.g., 'Pickup events this week'). |
| Subtitle | Measure | Optional | Context line below the value (e.g., 'Target: 90%'). |
| Change Value | Measure | Optional (numeric) | Numeric change for the indicator pill (e.g., -0.18 for 18% decrease). |
| Change Label | Measure | Optional | Text inside the pill. If blank, auto-formatted from Change Value. |
| Accent Colour | Measure | Optional (text) | Hex colour string for accent bar (e.g., #FF0000). Overrides static setting. |
| Text Colour | Measure | Optional (text) | Hex colour string for value text (e.g., #130064). Overrides static setting. |

**Note**: At least one measure field must be bound for the visual to display data. The Category field is optional but enables click-to-filter functionality.

## Formatting Options
The visual provides extensive formatting options in the Format pane:

### Visual Title
- **Show Title**: Toggle to display the title bar.
- **Title Text**: Custom title text (overrides any bound Label field if set).
- **Font Family**: Select font for the title.
- **Font Size**: Size in points.
- **Bold, Italic, Underline**: Text style toggles.
- **Alignment**: Left, Center, Right.
- **Font Color**: Color picker for title text.

### Card Style
- **Accent Colour**: Color for the accent border (left or top).
- **Accent Position**: Place accent border on Left, Top, or None.
- **Background Colour**: Background color of the card.

### Value Format
- **Format**: Choose Number, Percent, Currency, or Text.
- **Currency Symbol**: Symbol to use when Format is Currency (default: $).
- **Decimal Places**: Number of decimal places to display.
- **Font Family**: Font for the value.
- **Font Size**: Size in points.
- **Bold, Italic, Underline**: Text style toggles.
- **Value Colour**: Color for the value text (can be overridden by bound Text Colour field).
- **Alignment**: Left, Center, Right.

### Change Indicator
- **Direction Logic**: 
  - *Up is Good*: Positive values show as good (green), negative as bad (red).
  - *Down is Good*: Negative values show as good (green), positive as bad (red).
  - *Neutral*: All changes show as neutral (gray).
- **Show Change Pill**: Toggle to display the change indicator.
- **Font Family**: Font for the change pill.
- **Font Size**: Size in points.
- **Bold, Italic, Underline**: Text style toggles.
- **Alignment**: Left, Center, Right.

### Label
- **Font Family**: Font for the label.
- **Font Size**: Size in points.
- **Bold, Italic, Underline**: Text style toggles.
- **Label Color**: Color for the label text.
- **Alignment**: Left, Center, Right.

### Subtitle
- **Font Family**: Font for the subtitle.
- **Font Size**: Size in points.
- **Bold, Italic, Underline**: Text style toggles.
- **Subtitle Color**: Color for the subtitle text.
- **Alignment**: Left, Center, Right.

## Features
- **Click-to-Filter**: When a Category field is bound, clicking the card filters other visuals on the report page by that category (Ctrl/Cmd-click for multi-select).
- **Context Menu**: Right-click the visual to access the standard Power BI context menu (sort, drill through, etc.).
- **Tooltips**: Hover over the card to see a tooltip with detailed information (Label, Value, Subtitle, Change Value, etc.).
- **High Contrast Mode**: Automatically adapts to Windows high contrast settings for improved accessibility.
- **Responsive Design**: Font sizes adjust slightly in very narrow containers to prevent overflow while respecting user-defined sizes.
- **Selection and Highlighting**: Supports visual selection and highlighting when interacting with other visuals.
- **Multi-Visual Selection**: Can be part of a group selection with other visuals using Ctrl/Cmd-click.

## Limitations
- The visual displays a single data point (one row). If multiple rows are bound, only the first row is used.
- The Category field can only bind a single column (max 1).
- All measure fields (Value, Label, etc.) are limited to a single value each (max 1).
- The visual does not support drill-through actions beyond the standard context menu.
- Custom tooltips (report page tooltips) are not supported; only the default visual tooltip is available.

## Known Issues
None reported.

## Support URL
For support, visit: https://nexuscodex.nexus/support