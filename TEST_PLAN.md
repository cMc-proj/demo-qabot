# Demo Test Plan

DOD:
Runs with all files in sample_inputs/ without crashing.

Verbose toggle changes visible output.

Empty query shows friendly (non-blocking) message.

Passes UI Smoke Test: no console errors; responsive at 375/768/1024/1440.

## Inputs to Test
- Input 1: [describe]
- Input 2: [describe]
- Input 3: [describe]

## Expected Outputs
- For Input 1: [expected]
- For Input 2: [expected]
- For Input 3: [expected]

## Notes
- Does the program run without errors?
- Is output formatted clearly?
- Any edge cases to test?

## Acceptance Criteria

- The demo runs successfully using each file in `sample_inputs/` without crashing.
- For `input_basic.json`, output matches the expected default behavior (simple query, no verbose details).
- For `input_verbose.json`, output includes additional information/expanded details compared to the basic case.
- For `input_edgecase.json`, the demo handles the empty query gracefully (clear error message or defined fallback).
- Execution and output are consistent across different environments (local, cloud, etc.).

## UI Acceptance Criteria

### A. Cross-browser basic sanity
- [ ] Loads without console errors in **Chrome**, **Edge**, **Firefox**.
- [ ] Favicon/title show correctly.
- [ ] No mixed content (HTTP assets on HTTPS).

### B. Layout & visuals
- [ ] Header/logo visible, not distorted.
- [ ] Primary buttons have consistent size, padding, border-radius, and hover/active state.
- [ ] Sections align on a 12-column or consistent grid (gut check: equal left/right margins).
- [ ] No overlapping or cut-off text at 100% zoom.
- [ ] Cards/sections have consistent spacing (vertical rhythm ~8px multiples).

### C. Typography
- [ ] Base font size ≥ 16px; line-height 1.4–1.6.
- [ ] Headings follow a visual hierarchy (H1 > H2 > H3).
- [ ] Links are visually distinct (not only color).

### D. Navigation & interactions
- [ ] Nav links route to correct sections/pages.
- [ ] Buttons/links are keyboard-focusable and show a visible focus ring.
- [ ] Hover/active styles are present and consistent.

### E. Responsive behavior (mobile → desktop)
Resize to ~**375px**, **768px**, **1024px**, **1440px**:
- [ ] No horizontal scrollbar at common widths.
- [ ] Nav collapses to a hamburger or stacks cleanly on mobile.
- [ ] Images scale without stretching; max-width is respected.
- [ ] Tap targets ≥ 44×44px on mobile.

### F. Accessibility quick checks
- [ ] Can tab through the page top-to-bottom without getting “stuck”.
- [ ] Every image that conveys meaning has an `alt` attribute.
- [ ] Color contrast passes quick check (aim ≥ 4.5:1 for body text).
- [ ] Form controls (if any) have labels.

### G. Performance & assets (quick wins)
- [ ] No uncompressed images > 1MB.
- [ ] Only necessary web fonts loaded (limit variants).
- [ ] CSS/JS not duplicated; no obvious 404s in Network tab.

### H. “Demo-ready” flow
- [ ] Landing hero clearly states what the demo does (one-sentence value prop).
- [ ] Primary CTA (button) is above the fold and works.
- [ ] An example run/walkthrough section exists (or placeholder) with real sample text.

### UI Smoke Test Script (1 minute)

1. Open the site in Chrome → DevTools (F12) → Console is empty (no red errors).
2. Resize to 375px, 768px, 1024px, 1440px; scroll and check for overflow or broken layouts.
3. Press Tab repeatedly from the top—ensure focus moves logically; buttons/links show focus.
4. Hover primary buttons—confirm hover & active styles appear.
5. Open Network tab; hard refresh (Ctrl+F5)—confirm no 404s, images < 1MB, fonts reasonable.
