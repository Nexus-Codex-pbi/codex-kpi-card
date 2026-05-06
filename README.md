# Codex KPI Card

## Overview
KPI card with label, value, subtitle, change indicator pill, and accent border.

## Features
- Displays a primary value with optional label and subtitle
- Change indicator pill showing increase/decrease with configurable logic (up is good, down is good, neutral)
- Optional accent border (left or top) or no accent
- Click-to-filter: when a Category field is bound, clicking the card filters other visuals by that category
- Context menu (right-click) for cross-filtering and other interactions
- Tooltip on hover showing the bound data fields
- Full formatting control for title, label, value, subtitle, and change indicator
- High contrast mode support
- Responsive font scaling for narrow containers
- Supports keyboard focus and screen readers

## Data Roles
| Role | Display Name | Kind | Required? | Data Type | Description |
|------|--------------|------|-----------|-----------|-------------|
| category | Category | Grouping | No (max 1) | Text or Grouping | Optional grouping column. When bound, clicking the card filters other visuals by this category. |
| value | Value | Measure | No (max 1) | Number, Date, Text | Primary metric to display (e.g. 23, 87.3%, $14,100, 5RSOUTH) |
| label | Label | Measure | No (max 1) | Text | Title text above the value (e.g. 'Pickup events this week') |
| subtitle | Subtitle | Measure | No (max 1) | Text | Context line below the value (e.g. 'Target: 90%') |
| changeValue | Change Value | Measure | No (max 1) | Numeric | Numeric change for the indicator pill (e.g. -0.18 for 18% decrease) |
| changeLabel | Change Label | Measure | No (max 1) | Text | Text inside the pill. If blank, auto-format from changeValue. |
| accentColour | Accent Colour | Measure | No (max 1) | Text | Hex colour string for accent bar (e.g. #FF0000). Overrides static setting. |
| textColour | Text Colour | Measure | No (max 1) | Text | Hex colour string for value text (e.g. #130064). Overrides static setting. |

Note: Each role can have at most one field bound.

## Formatting Options
The visual provides the following format pane cards:

### Title Settings
- Show Title: Toggle the visual title
- Title Text: Custom title text
- Font Family, Font Size, Bold, Italic, Underline
- Alignment (left, center, right)
- Font Color

### Card Style
- Accent Colour: Color of the accent border (can be overridden by accentColour field)
- Accent Position: Left, Top, or None
- Background Colour: Card background

### Value Format
- Format: Number, Percent, Currency, Text
- Currency Symbol (when format is Currency)
- Decimal Places
- Font Family, Font Size, Bold, Italic, Underline
- Value Colour
- Alignment (left, center, right)

### Change Indicator
- Direction Logic: Up is Good, Down is Good, Neutral (controls pill color and arrow)
- Show Change Pill: Toggle the pill visibility
- Font Family, Font Size, Bold, Italic, Underline
- Alignment (left, center, right)

### Label
- Font Family, Font Size, Bold, Italic, Underline
- Label Colour
- Alignment (left, center, right)

### Subtitle
- Font Family, Font Size, Bold, Italic, Underline
- Subtitle Colour
- Alignment (left, center, right)

## How to Use
1. Import the `.pbiviz` file into Power BI Desktop (from the Visuals pane -> ... -> Import from file).
2. Locate the visual in the Visualizations pane and add it to the report canvas.
3. Bind data to one or more of the data roles (Category, Value, Label, Subtitle, Change Value, Change Label, Accent Colour, Text Colour).
4. Use the format pane to adjust the appearance.
5. Interact:
    - Click the card to cross-filter other visuals when a Category is bound.
    - Right-click for the context menu.
    - Hover to see a tooltip with the bound data.

## Limitations
- The visual expects a single row of data. If multiple rows are present, the first row is used (as per the dataViewMapping).
- Each data role can accept only one field.
- The Change Value role must be a numeric field.
- The Accent Colour and Text Colour roles must be text fields (hex colour strings).

## Support
For help or questions, visit https://nexuscodex.nexus/support

## Legal
MIT License