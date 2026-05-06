# Accessibility Statement for optiStockKpiCard

## Keyboard Navigation
The visual supports keyboard navigation. Users can focus the visual using the Tab key. When focused, pressing Enter or Space activates the click-to-filter behavior (if a Category is bound) or opens the context menu via Shift+F10. The visual does not trap focus and follows the standard tab order of the report page.

## High Contrast Mode
The visual adapts to high contrast modes. When high contrast is detected (via the host's color palette), the visual:
- Uses the system foreground color for text elements (label, value, subtitle, change pill) if the user has not overridden with a specific color setting.
- Uses transparent backgrounds for the change pill and relies on foreground color for text to ensure readability.
- Maintains visible borders and accent elements using system colors where appropriate.

## Screen Reader Support
The visual provides accessible labels and roles for screen readers:
- The container element has a role of "group" and an aria-label that combines the title, label, value, subtitle, and change information when available.
- Each text element (title, label, value, subtitle, change pill) is exposed as plain text within the group.
- The change pill includes an accessible description indicating the direction (e.g., "increase", "decrease") and the change value.
- When a Category is bound, the visual indicates that clicking will filter other visuals (via the selection manager's built-in accessibility).

## Color Usage
The visual does not rely solely on color to convey information:
- The change pill uses both color and an arrow symbol (▲ for increase, ▼ for decrease, → for neutral) to indicate direction and magnitude.
- Users can customize colors via the format pane, but the visual ensures that the change pill's arrow symbol remains visible regardless of color choices.
- In high contrast mode, the visual uses system colors to ensure sufficient contrast.

## Animations
The visual does not include any animations. All updates are immediate and do not involve motion or transitions that could trigger vestibular disorders.

## Text Scaling
The visual respects the user's text scaling settings:
- Font sizes for title, label, value, subtitle, and change pill are set in points (pt) and scale with the user's display settings.
- The visual does not override or disable the browser's text scaling capabilities.
- Responsive font scaling is applied only when the container width is very narrow (less than 200px) to prevent overflow, but still respects the minimum font size set by the user.

## Summary
optiStockKpiCard is designed to be accessible and compliant with WCAG 2.1 guidelines. It supports keyboard navigation, high contrast mode, screen readers, provides color-independent indicators, avoids animations, and respects text scaling. Users with disabilities should be able to interact with and perceive the visual effectively.