# Test Plan: optiStockKpiCard

## Functional Tests
- [ ] Rendering
  - [ ] Visual renders correctly with all data fields bound
  - [ ] Visual displays empty state when no data bound
  - [ ] Visual handles null values gracefully
  - [ ] Visual displays only first row when multiple rows provided
  - [ ] Category field enables click-to-filter functionality
  - [ ] Without Category, click does not filter (no-op)
  - [ ] Value field displays correctly in Number, Percent, Currency, Text formats
  - [ ] Label and subtitle display correctly when bound
  - [ ] Change pill displays when changeValue bound and showChange enabled
  - [ ] Change pill shows correct direction arrow (▲, ▼, →) based on change value
  - [ ] Change pill color follows Direction Logic (Up is Good, Down is Good, Neutral)
  - [ ] Accent border displays when accentColour bound or format pane set
  - [ ] Accent border position changes based on Accent Position setting
  - [ ] Text colour overrides value text color when bound
  - [ ] Tooltip displays label (if bound) on hover
  - [ ] Context menu opens on right-click
  - [ ] Visual title displays when Show Title enabled
  - [ ] All formatting options (font, size, color, alignment) apply correctly

- [ ] Interactions
  - [ ] Click-to-filter works with single select
  - [ ] Click-to-filter works with multi-select (Ctrl/Cmd)
  - [ ] Click visual updates selection state and filters other visuals
  - [ ] Right-click opens context menu with expected options
  - [ ] Hover shows tooltip, mouseleave hides tooltip
  - [ ] Visual supports highlighting from other visuals
  - [ ] Visual can be multi-selected with other visuals (Ctrl/Cmd)

## Performance Tests
- [ ] Initial render completes within acceptable time (<500ms)
- [ ] Update with new data completes within acceptable time (<100ms)
- [ ] Visual does not cause layout thrashing or excessive repaints
- [ ] Memory usage remains stable during repeated updates
- [ ] Responsive font scaling adjusts correctly at viewport width breakpoints
- [ ] No memory leaks detected during rapid data updates

## Accessibility Tests
- [ ] Keyboard Navigation
  - [ ] Visual is focusable via Tab key
  - [ ] Enter key activates click (filter if Category bound)
  - [ ] Space bar activates click (filter if Category bound)
  - [ ] Shift+F10 or context menu key opens context menu
  - [ ] Focus outline is visible when focused
- [ ] High Contrast Mode
  - [ ] Text colors adapt to system foreground in high contrast
  - [ ] Change pill background becomes transparent in high contrast
  - [ ] All text remains readable in high contrast mode
  - [ ] Visual functions correctly when Windows high contrast enabled
- [ ] Screen Reader
  - [ ] All text content (title, label, value, subtitle, change) is announced
  - [ ] Change pill state (increase/decrease/neutral) is conveyed
  - [ ] Visual announces as a single logical unit
  - [ ] No inaccessible interactive elements
- [ ] Color Usage
  - [ ] Change pill uses both color and symbol to convey information
  - [ ] Visual does not rely solely on color for meaning
  - [ ] Sufficient contrast between text and background in default themes
- [ ] Text Scaling
  - [ ] Visual respects browser/text scaling settings
  - [ ] Font sizes scale appropriately with system settings
  - [ ] No text clipping or overflow at larger text sizes

## Security Tests
- [ ] No external network requests are made
- [ ] No telemetry data is collected or transmitted
- [ ] Visual does not use eval(), Function(), or similar dynamic code
- [ ] Visual does not use innerHTML or outerHTML for DOM injection
- [ ] All data binding uses textContent or safe DOM APIs
- [ ] Visual does not access localStorage, sessionStorage, or cookies
- [ ] Visual does not request additional privileges
- [ ] All dependencies are from trusted Power BI sources

## Packaging Tests
- [ ] pbiviz package succeeds without errors
- [ ] Generated .pbiviz file contains all required resources
- [ ] visual.js and visual.min.js are present in package
- [ ] style/visual.less is compiled and included
- [ ] capabilities.json and pbiviz.json are valid
- [ ] String resources (if any) are correctly packaged
- [ ] Icon asset is present and correctly referenced
- [ ] Package passes pbiviz validation
- [ ] Package can be imported into Power BI Desktop
- [ ] Package displays correctly in Power BI Service (if applicable)

## Sample PBIX Verification
- [ ] Create test PBIX with sample data binding all fields
- [ ] Verify visual displays expected values and formatting
- [ ] Test click-to-filter with Category bound
- [ ] Test tooltips on hover
- [ ] Test context menu
- [ ] Test high contrast mode
- [ ] Test keyboard navigation
- [ ] Save and reopen PBIX to ensure state persistence
- [ ] Publish to Power BI Service (if licensed) and verify cloud rendering