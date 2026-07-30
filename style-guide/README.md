# Style Guide: Light Film Room Design System

A generalized, reusable design system based on the Ulti-Pedia encyclopedia. This system emphasizes clarity, precision, and authority through clean typography, minimal colors, and grid-aligned layouts.

## Contents

### `design.md`
Comprehensive design system documentation covering:
- **Color Palette**: Primary colors, accent colors, and semantic usage
- **Typography**: Font stacks, weights, sizes, and best practices
- **Component Patterns**: Buttons, inputs, pills, cards, panels
- **Grid & Layout**: Responsive breakpoints and container widths
- **Special Effects**: Graph paper backgrounds, border radius rules
- **Accessibility**: Color contrast, focus indicators, keyboard navigation
- **Usage Instructions**: How to implement the system in HTML/CSS

### `example.html`
A fully functional mockup website showcasing all design system components:
- Live color swatches with hex codes
- Typography demonstrations (Archivo Black, JetBrains Mono, Helvetica Neue)
- Interactive buttons, forms, and inputs
- Card and panel layouts
- Responsive grid examples
- Working sidebar layout that collapses on mobile
- Navigation and footer examples

**To view**: Open `example.html` in a web browser. The page includes working form submissions, smooth scrolling, and demonstrates all responsive behaviors.

### `fonts/` — removed
Fonts now live in one place only: the main project's `frontend/public/fonts/`.
Keeping a second copy here meant two things to license and two to keep in sync.

- **Archivo Black** (`ArchivoBlack-Regular.ttf` + `ArchivoBlack-OFL.txt`) — display
- **JetBrains Mono** (Regular + Bold) — UI/mono

Both are SIL OFL 1.1: free for commercial use *and* web embedding, so both are
safely self-hosted.

**Previously**: Druk *trial* builds lived here and were served from production —
removed, since a trial license does not cover public distribution. Arena was
considered and rejected: personal-use only, and its terms forbid distributing the
file on any website. Do not reintroduce either.

## Quick Start

To use this design system in your own project:

1. **Copy the fonts** from the main project's `frontend/public/fonts/`
   (Archivo Black + its OFL text, JetBrains Mono) into your public/static folder
2. **Reference the color palette** in your CSS/Tailwind config using the values in `design.md`
3. **Use the CSS** from `example.html` as a template
4. **Follow the typography rules**: Archivo Black for headings, JetBrains Mono for UI, Helvetica Neue for body

## Key Characteristics

- **Hard corners** (no border-radius) for a technical, precise aesthetic
- **Minimal color palette** with strategic pink and green accents
- **Three-tier typography**: display (Archivo Black), UI (JetBrains Mono), body (Helvetica Neue)
- **Grid-based spacing** using 8px baseline
- **Light backgrounds** with clear visual hierarchy through subtle grays
- **100% WCAG AA compliant** contrast ratios

## Customization

To adapt this system to your brand:

1. **Colors**: Replace the hex values in `design.md` and CSS with your brand palette
2. **Fonts**: Substitute your own typefaces (keep the tier structure: display, mono, sans)
3. **Spacing**: Adjust the 8px grid or 32px container padding to your needs
4. **Border style**: If hard corners don't fit your brand, set a consistent border-radius

## Reference

- **Archivo Black**: Heavy geometric display typeface, SIL OFL 1.1 — free for
  commercial use and web embedding (https://fonts.google.com/specimen/Archivo+Black).
  Single weight (400) by design
- **JetBrains Mono**: Free, open-source monospace typeface (SIL OFL 1.1)
- **Helvetica Neue**: System fallback for body text (falls back to Arial)
- **Anton / Oswald**: Other OFL display faces, if you want a different flavour of
  the same tier

## License Notes

- Every font here is SIL OFL 1.1 — free for commercial use and web embedding.
  Ship each font's license text alongside it; the OFL requires it.
- **The rule**: this repo is public and auto-deploys, so a committed font is a
  *distributed* font. A display face must be self-hostable under a license that
  permits web embedding. Trial builds (Druk) and personal-use freeware (Arena)
  do not qualify and have both been removed.
- CSS and HTML examples in this guide are free to use and modify
