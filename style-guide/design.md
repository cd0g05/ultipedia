# Light Film Room Design System

A clean, minimal, grid-based design system emphasizing clarity and precision. Inspired by editorial layouts and spec sheets, this system works well for reference materials, knowledge bases, and content-heavy applications.

## Overview

The Light Film Room is built on:
- **Hard corners** (no border-radius) for a technical, precise aesthetic
- **Minimal color palette** with strategic accent colors for hierarchy
- **Three-tier font system** for distinct visual layers (heading, UI, body)
- **Grid-aligned spacing** and component sizes
- **Light backgrounds** with clear visual hierarchy through subtle grays

## Color Palette

### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Base** | `#ffffff` | Main background for cards, panels, and page surfaces |
| **Panel** | `#f4f4f5` | Secondary background for contained regions (sidebars, filters, data tables) |
| **Border** | `#d4d4d8` | Structural dividers between regions, input borders, rules |

### Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Accent Pink** | `#be185d` | Primary interactive elements (buttons, links, hover states) |
| **Accent Pink Dark** | `#9d174d` | Hover/active state for pink accents (20% darker) |
| **Accent Green** | `#047857` | Secondary actions, success states, alternative CTAs |

### Semantic Colors

- **Text Primary**: `#18181b` (zinc-900) — all body text and labels
- **Text Secondary**: `#a1a1aa` (zinc-500) — disabled text, placeholders, hints
- **Text Muted**: `#e4e4e7` (zinc-200) — graph paper backgrounds, very light text

## Typography

### Font Stack

#### Headings (Display)
```css
font-family: "Archivo Black", "Oswald", "Arial Narrow", sans-serif;
```
- **Font**: Archivo Black (self-hosted, `frontend/public/fonts/ArchivoBlack-Regular.ttf`)
- **License**: SIL OFL 1.1 — free for commercial use **and** web embedding. The
  license text ships next to the font as `ArchivoBlack-OFL.txt`; the OFL requires
  it to travel with the file, so keep them together.
- **Weights**: **400 only.** Archivo Black ships a single cut — its weight *is*
  its identity. Never set `font-weight: 700` or `900` against it; the browser
  synthesises a fake bold, which smears a display face badly.
- **Usage**: Page titles, section headers, entry names
- **Character**: Geometric, heavy, commanding presence
- **Fallback**: Oswald, then Arial Narrow — only visible during font load

> **Two previous display faces were removed, both for the same reason.** This repo
> is public and auto-deploys to Vercel, so any font committed under `public/` is
> being *distributed*, not merely used:
>
> - **Druk** (Commercial Type) was self-hosted from **trial** builds and served
>   from production. A trial license covers evaluation, not public distribution.
> - **Arena** is licensed for **personal use only** and its terms explicitly
>   forbid uploading or distributing the file "on any website or platform", plus
>   any commercial use without a paid license.
>
> The rule this leaves behind: **a display face for this project must be
> self-hostable under a license that permits web embedding.** OFL faces (Archivo
> Black, Anton, Oswald) qualify. Trial builds and personal-use freeware do not.

#### UI / Monospace (Navigation, Pills, Buttons, Badges)
```css
font-family: "JetBrains Mono", monospace;
```
- **Font**: JetBrains Mono
- **Weights**: 400 (Regular), 700 (Bold)
- **Usage**: Navigation text, button labels, filter pills, badges, data labels
- **Character**: Monospace, technical, grid-aligned
- **Kerning**: Fixed-width ensures perfect alignment

#### Body Text (Prose)
```css
font-family: "Helvetica Neue", Arial, sans-serif;
```
- **Font**: Helvetica Neue (system fallback to Arial)
- **Weights**: 400 (Regular), 600/700 (Bold for emphasis)
- **Usage**: Paragraph text, descriptions, entry content
- **Character**: Clean, neutral, professional
- **Line Height**: 1.6 for body content

### Font Size Scale

- **Display**: 2.5rem–3.5rem (for page titles)
- **Heading Large**: 2rem (section headers)
- **Heading Medium**: 1.5rem (subsections)
- **Heading Small**: 1.25rem (component titles)
- **Body Large**: 1rem (main prose)
- **Body Regular**: 0.95rem (secondary content)
- **Body Small**: 0.875rem (captions, hints)
- **UI/Label**: 0.75rem–0.875rem (buttons, pills, badges)

## Component Patterns

### Spacing

All spacing uses an 8px baseline grid:
- **xs**: 4px (small gaps, text inside buttons)
- **sm**: 8px (component padding, tight groupings)
- **md**: 16px (default section spacing)
- **lg**: 24px (major section breaks)
- **xl**: 32px (page margins, large blocks)

### Buttons

**Primary Button** (Accent Pink background)
```css
background-color: #be185d;
color: white;
padding: 8px 20px;
font-family: "JetBrains Mono", monospace;
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.05em;
border: none;
```
- Hover: `#9d174d` (Accent Pink Dark)
- Focus: Keep border + ring for keyboard accessibility

**Secondary Button** (White background, border)
```css
background-color: #ffffff;
border: 1px solid #d4d4d8;
color: #18181b;
```
- Hover: Background becomes `#f4f4f5`

**Text Link** (No background)
- Color: `#be185d` (Accent Pink)
- Hover: `#9d174d` (underline appears)
- Active: Same dark color

### Input Fields

```css
border: 1px solid #d4d4d8;
background-color: #ffffff;
padding: 8px 16px;
font-family: "Helvetica Neue", Arial, sans-serif;
```
- Focus: `border-color: #be185d; outline: none; box-shadow: 0 0 0 2px rgba(190, 24, 93, 0.1);`
- Placeholder: `color: #a1a1aa;`
- Disabled: `background-color: #f4f4f5; color: #a1a1aa;`

### Pills / Badges

```css
display: inline-block;
padding: 4px 12px;
background-color: #f4f4f5;
border: 1px solid #d4d4d8;
font-family: "JetBrains Mono", monospace;
font-size: 0.75rem;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
border-radius: 0;
```

### Dividers / Rules

Use `border-top: 1px solid #d4d4d8;` for horizontal rules between sections.

### Panels / Cards

```css
background-color: #ffffff;
border: 1px solid #d4d4d8;
padding: 24px;
```

Alternate (sidebar/secondary):
```css
background-color: #f4f4f5;
border: none;
padding: 24px;
```

## Grid & Layout

### Responsive Breakpoints

Align with Tailwind defaults:
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px

### Container Widths

- **Mobile**: Full width minus padding (16px–24px margins)
- **Tablet**: 90vw, max 768px
- **Desktop**: 90vw, max 1200px

## Special Effects

### Graph Paper Background
For empty states or "tactical board" placeholders:
```css
background-image: 
  linear-gradient(to right, #e4e4e7 1px, transparent 1px),
  linear-gradient(to bottom, #e4e4e7 1px, transparent 1px);
background-size: 2rem 2rem;
```

### Border Radius
**Global rule**: All components use `border-radius: 0` (hard corners).

## Usage in HTML/CSS

### Loading the Fonts

Both fonts are self-hosted from `frontend/public/fonts/` — no Google Fonts link,
no third-party request at render time. Copy the files into your own
public/static folder and declare:

```css
@font-face {
  font-family: "Archivo Black";
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src: url("/fonts/ArchivoBlack-Regular.ttf") format("truetype");
}

@font-face {
  font-family: "JetBrains Mono";
  font-weight: 400;
  src: url("/fonts/JetBrainsMono-Regular.ttf") format("truetype");
}

@font-face {
  font-family: "JetBrains Mono";
  font-weight: 700;
  src: url("/fonts/JetBrainsMono-Bold.ttf") format("truetype");
}
```

Ship `ArchivoBlack-OFL.txt` alongside the font — the OFL requires the license to
travel with the file. Body text needs no `@font-face`: Helvetica Neue / Arial are
system faces.

To substitute a different display face, check first that its license permits
**web embedding** (see § Typography for why this project is strict about it), then
point the `@font-face` at it and put its family name first in the `heading` stack
in `tailwind.config.js`.

### Scoping the System

To apply this design system to a page or section, add the class `light-film-room`:

```css
.light-film-room {
  font-family: "Helvetica Neue", Arial, sans-serif;
  color: #18181b;
  background-color: #ffffff;
}

.light-film-room * {
  border-radius: 0;
}
```

## Accessibility

- **Color Contrast**: Pink accents (`#be185d`) on white meet WCAG AA for all sizes
- **Focus Indicators**: Always provide visible focus outlines for keyboard navigation
- **Text Alternatives**: Use semantic HTML; labels on all form inputs
- **Motion**: Avoid parallax; prefer simple transitions (200ms) on hover/focus
- **Typeface**: Archivo Black and Helvetica Neue are both readable at small sizes; JetBrains Mono is designed for fixed-width clarity

## Tone

The Light Film Room conveys:
- **Precision**: Hard corners, monospace accents, grid alignment
- **Clarity**: High contrast, minimal decoration, clear visual hierarchy
- **Authority**: Bold heading font, structured layouts
- **Approachability**: Clean, minimal, not intimidating

Use this system for reference materials, knowledge bases, data-heavy interfaces, and editorial content that prioritizes information density and clarity.
