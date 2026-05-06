# User Guide – Codex KPI Card

## Overview
KPI card with label, value, subtitle, change indicator pill, and accent border. Displays a primary metric with optional contextual labels and change indicator.

## 1. Adding the Visual
1. Import the `.pbiviz` file into Power BI Desktop
2. Locate the visual in the Visualizations pane
3. Drag it onto the report canvas

## 2. Data Binding
- **Category** (Optional): Grouping column. When bound, clicking the card filters other visuals by this category.
- **Value** (Required): Primary metric to display (e.g. 23, 87.3%, $14,100, 5RSOUTH).
- **Label** (Optional): Title text above the value (e.g. 'Pickup events this week').
- **Subtitle** (Optional): Context line below the value (e.g. 'Target: 90%').
- **Change Value** (Optional): Numeric change for the indicator pill (e.g. -0.18 for 18% decrease). Must be numeric.
- **Change Label** (Optional): Text inside the pill. If blank, auto-formatted from changeValue.
- **Accent Colour** (Optional): Hex colour string for accent bar (e.g. #FF0000). Overrides static setting.
- **Text Colour** (Optional): Hex colour string for value text (e.g. #130064). Overrides static setting.

## 3. Formatting Options
- **Visual Title**: Show title, title text, font family, size, bold, italic, underline, alignment, font color.
- **Card Style**: Accent colour, accent position (left, top, none), background colour.
- **Value Format**: Format (number, percent, currency, text), currency symbol, decimal places, font family, size, bold, italic, underline, value colour, alignment.
- **Change Indicator**: Direction logic (up is good, down is good, neutral), show change pill, font family, size, bold, italic, underline, alignment.
- **Label**: Font family, size, bold, italic, underline, label colour, alignment.
- **Subtitle**: Font family, size, bold, italic, underline, subtitle colour, alignment.

## 4. Features
- Click-to-filter other visuals when a Category is bound (right-click for context menu).
- Tooltips on hover showing bound fields.
- High contrast mode support with automatic colour adaptation.
- Responsive font scaling for narrow containers.
- Change indicator pill with directional arrow (▲/▼/→) and colour-coded background.
- Accent border (left or top) driven by data or format setting.
- Full formatting control for title, label, value, subtitle, and change indicator.

## 5. Limitations
- Displays only the first row of data; additional rows are ignored.
- Change indicator pill only appears when Change Value is bound and Show Change is enabled.
- Accent and text colour overrides require hex colour strings in data fields.
- Single-value card: does not support series or multiple values.

## 6. Support
For help or questions, visit https://nexuscodex.nexus/support