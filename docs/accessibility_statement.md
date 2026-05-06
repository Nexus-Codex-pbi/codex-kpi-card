# Accessibility Statement – Codex KPI Card

## Overview
This document outlines the accessibility compliance of the **Codex KPI Card** Power BI custom visual.

## 1. Keyboard Navigation
The visual supports keyboard navigation for all interactive elements. Focus indicators are visible and follow standard browser behaviour. Click and context‑menu actions can be triggered via Enter/Space when the card has focus.

## 2. High Contrast Mode
The visual supports Power BI high contrast themes. Text, borders, and backgrounds adapt automatically. No hard‑coded colours that break accessibility. The visual uses the host color palette to determine foreground/background colours in high contrast mode.

## 3. Screen Reader Support
- ARIA labels are applied to interactive elements where applicable.
- Non‑decorative icons (the change‑pill arrow) include accessible text via ARIA‑label or role.
- UI controls expose meaningful names through the accessibility tree.

## 4. Color Usage
- The visual does not rely solely on colour to convey meaning. The change indicator uses both colour and an arrow symbol (▲/▼/→) to indicate direction and value.
- No flashing or strobing content.

## 5. Animations
- Animations are minimal and non‑looping (only internal state changes).
- Respects `prefers-reduced-motion` where applicable (no CSS transitions that ignore the setting).
- No motion that could trigger vestibular issues.

## 6. Text Scaling
The visual respects Power BI text scaling and browser zoom. Font sizes are set in relative units where appropriate and scale with the host’s text size settings.

## 7. Summary
**Codex KPI Card** meets Microsoft's accessibility requirements and is designed to be usable by all users, including those relying on assistive technologies.