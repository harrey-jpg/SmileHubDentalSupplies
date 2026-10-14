---
name: SmileHub Dental Supplies
description: Trusted teal-and-blue dental supply storefront built for Philippine clinics
colors:
  primary: "#0f8f8f"
  primary-deep: "#096d70"
  secondary: "#1261a0"
  secondary-deep: "#0b4779"
  accent: "#ffb84d"
  ink: "#12343b"
  text: "#203047"
  muted: "#64777b"
  surface: "#ffffff"
  canvas: "#f4f7fa"
  soft: "#e9f7fb"
  border: "#dcebea"
  danger: "#d64545"
  success: "#1e9b61"
  warning: "#f0a320"
  dark-canvas: "#101820"
  dark-surface: "#17232e"
  dark-text: "#edf6fb"
  dark-muted: "#a9bbc8"
  dark-border: "#2b3a47"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontWeight: 800
    lineHeight: 1.04
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.5
  mono:
    fontFamily: "Consolas, monospace"
    letterSpacing: "0.3px"
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "68px"
components:
  button-primary:
    backgroundColor: "{colors.secondary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    fontWeight: 700
  button-secondary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 18px"
    fontWeight: 700
  button-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 18px"
  button-hover:
    transform: "translateY(-2px)"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    border: "1px solid var(--border)"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "9px"
    padding: "11px 12px"
    border: "1px solid var(--border)"
  status-chip:
    rounded: "{rounded.pill}"
    padding: "5px 9px"
    fontSize: "0.78rem"
---

# Design System: SmileHub Dental Supplies

## Overview

**Creative North Star: "Your Trusted Dental Supply Partner"**

SmileHub presents itself as the dependable, trusted supply partner for dental clinics in the Philippines — a working full-stack storefront that earns confidence through clarity, consistency, and a calm blue-and-teal palette borrowed from clean clinical environments. The personality is **tactile and confident**: rounded, comfortable controls with crisp feedback, a clear visual hierarchy on every page, and status communicated through familiar context. Reachable trust, not sterile distance.

Layout is a generous, centered system (container max 1180px) built on 2/3/4-column grids that collapse to single columns at ~640px and below. Cards float on soft layered shadows; interactive elements lift slightly on hover (`translateY(-2px)`) with a fast 0.2s ease — the shop feels responsive and alive without being busy. Headlines command with heavy weights and tight line-height; body copy stays quiet and legible.

A full dark mode re-maps surfaces to deep navy/ink tones (`#101820`, `#17232e`) and softens text to pale blue-gray, preserving the same teal accents.

**Key Characteristics:**
- Teal + trust-blue primary system with a single warm amber accent
- System sans (Arial/Helvetica) for everything; mono (Consolas) reserved for SKU codes
- Rounded, tactile controls; pills and badges carry status
- Soft layered elevation; hover lifts interactive elements
- Clear dominance: one primary action per region, muted supporting text

## Colors

Teal is the product; blue is the institution; amber is the sparkle.

### Primary
- **Clinic Teal** (#0f8f8f): brand identity and secondary actions, gradient progress fills, timelines.
- **Deep Teal** (#096d70): primary teal on hover/pressed/dark states, links and category labels.

### Secondary
- **Trust Blue** (#1261a0): primary buttons, prices, active tabs, chatbot, logo, gradient starts.
- **Deep Blue** (#0b4779): topbar, admin sidebar, footer, promo/CTA backgrounds ("The Banner Rule").

### Tertiary
- **Safety Amber** (#ffb84d): the single warm accent — highlights stars, price callouts, special flags only.

### Neutral
- **Surface White** (#ffffff): cards, inputs, header, modals.
- **Cloud Canvas** (#f4f7fa): page background; admin pages use a slightly cooler `#eef3f7`.
- **Sky Mist** (#e9f7fb): soft fills — product image wells, table headers, nav active state, avatars.
- **Ink Navy** (#12343b): primary text on premium surfaces.
- **Slate Text** (#203047): default body text.
- **Stone Muted** (#64777b / #6b7a8c): secondary and muted copy, SKU labels.
- **Mist Border** (#dcebea / #dce5ec): hairline borders on cards, inputs, dividers.
- **Alert Red** (#d64545): destructive actions, wishlist hearts, error states.
- **Stock Green** (#1e9b61): in-stock and delivery status.
- **Warning Amber** (#f0a320): warnings, ratings stars.

Dark mode maps: canvas `#101820`, surface `#17232e`, text `#edf6fb`, muted `#a9bbc8`, border `#2b3a47`, soft fill `#122b36`; shadow deepens to `rgba(0,0,0,0.30)`.

### Named Rules
**The Rare-Accent Rule.** Amber is never the base of a button or background fill of a region; it points at the exceptional (ratings, deals, milestones) and occupies a small share of any screen.
**The Status Pill Rule.** Order/product status never speaks in plain text alone — it always wears a tinted pill (amber processing, green delivered, red low/out-of-stock, gray disabled).

## Typography

A system sans stack (Arial, Helvetica, sans-serif) carries the entire interface; no webfonts are loaded (performance on GitHub Pages).

**Display:** The same sans-family at heavy 800 weight — used only for page, section, and hero titles; tight line-height (1.04 for hero).
**Body:** The sans stack at 1rem, line-height 1.5, muted color for everything secondary.
**Label/Mono:** Consolas, monospace, letter-spaced 0.3px — exclusively for SKU / order / tracking codes.

### Hierarchy
- **Display** (800, `clamp(2.3rem, 6vw, 4.6rem)`, 1.04): hero headline — the single largest statement on a page.
- **Headline** (800, `2em`): page titles.
- **Title** (700, `clamp(1.7rem, 4vw, 2.4rem)`): section titles.
- **Body** (400, `1rem`, 1.5): default copy; supporting text is muted with a 1.08rem relaxed variant in the hero.
- **Label** (700, `0.82–0.9rem`): form labels, category eyebrow (`.78rem`, uppercase, +0.08em), breadcrumbs, muted metadata.

### Named Rules
**The Sloppy-Kicker Rule.** Uppercase eyebrow/kicker text is never the biggest thing on screen — it prepares, the headline does the speaking.
**The Mono-Only-Code Rule.** Monospace appears only where a code appears (SKU, order number, price lines in invoices); never in body prose.

## Layout

A centered, max-width `1180px` container at 92% of viewport. Vertical rhythm is 68px sections (36px for compact sections); `md` (16px) and `lg` (24px) gaps drive grids (`22px` standard grid gap).

- **Header:** 3-zone grid — logo and brand, pill search bar, icon actions, then a nav strip under a hairline.
- **Hero:** asymmetric two-column (`1.1fr/0.9fr`) with a frosted-glass card; gradient background sweeping sky → white → mint.
- **Product/category/brand/testimonial cards:** responsive grids across 2–4 columns, collapsing to 2 at ≤900px, 1 at ≤560px.
- **Shop pages:** sidebar-and-content layout (`250px/1fr`) with a sticky filter panel; cart/checkout use `1fr/360px` with a summary rail.
- **Admin:** fixed sidebar (`240px` deep-blue) + fluid content area.
- **Mobile:** fixed bottom nav (≤900px) with frosted blur; content pad-bottom accommodates it; quick actions always visible at ≤560px.

**Breakpoints:** 1180px container; grids collapse at 900, 700, 640, 560, and 520px as each layout dictates. Print styles hide chrome and flatten to white for invoices/order slips.

### Named Rules
**The Float-By-Default Rule.** Product and content objects float on soft shadows at rest — elevation is a property of the card, not its state. Only interactive micro-interactions (buttons, chips, wishlist) lift on hover.
**The Sticky-Intent Rule.** It is acceptable for persistent helpers to be sticky (filter panel, header, bottom nav), but the sticky surface must be translucent or clearly surfaced so content passing beneath it never reads as hidden.

## Elevation & Depth

Layered soft shadows communicate depth. Two shadow stages:

- **Ambient Card** (`0 10px 25px rgba(29,73,106,0.10)`, dark: `rgba(0,0,0,0.30)`): the resting elevation of cards, panels, header, and menu surfaces.
- **Deep Float** (`0 18px 50px rgba(16,67,72,0.12)`): modals, toasts, mini-cart drawer, back-to-top and command palette — anything that needs to clearly sit above the page.
- **Hover Lift:** buttons and brand chips translate up 2px on hover with the ambient shadow; no blur/scale increase beyond it.

Depth is also created tonally: product image wells sit on Sky Mist, and admin/promo regions invert to deep blue, creating change of surface rather than relying on shadow alone.

### Named Rules
**The Low-Shadow Rule.** The darkest, heaviest shadows are reserved for floating layers (modals, drawers, command palette) — they lift the app, never crush the page.

## Shapes

The form language is rounded and friendly, weighed by role:

- **Pills (`999px`)** — status chips, badges, category labels, search/input wells, verification badges, distribution of pills everywhere status lives.
- **Medium (`10px`)** — buttons, icon buttons, inputs, small controls.
- **Large (`14px`)** — cards, tables, filters.
- **Extra-large (`20–26px`)** — modals (`24px`), hero card (`26px`), promo band (`24px`), command palette (`20px`).
- **Circles** — avatar/profile (with white ring and shadow), wishlist hearts, chatbot button.

Borders are `1px` hairlines on cards and controls; inputs and controls on hover/focus gain a teal border plus a soft ring (`0 0 0 3px rgba(15,143,145,.13)`).

### Named Rules
**The Radius-by-Role Rule.** The bigger the object, the rounder the corner (pill for chips → 26px for hero); controls never exceed 14px so buttons stay instantly recognizable as buttons.

## Components

### Buttons
- **Shape:** radius 10px, padding `12px 18px`, weight 700, inline-flex with optional icon gap.
- **Primary:** Trust Blue fill, white text — the dominant action.
- **Secondary:** Clinic Teal fill, white text — supporting or accent actions, secondary CTA.
- **Light:** Surface white + hairline border — tertiary or toolbar actions.
- **Danger:** Alert Red fill, white text — destructive.
- **Hover / Focus:** `translateY(-2px)` lift with 0.2s ease; block variant (`width:100%`) for mobile.

### Chips / Status Pills
- **Style:** pill radius, `5-9px` padding, 0.78rem weight-700 text, tinted background per meaning: amber `#fff4d7`/`#9b6800` (processing/warning), green `#e8f7ef`/`#16864f` (delivered/in-stock), red `#fde9e9`/`#b93434` (low/out-of-stock), gray `#f0f0f0`/`#6b7a8c` (disabled).

### Cards / Containers
- **Corner Style:** 14px radius.
- **Background:** surface white; hairline `1px` border `var(--border)`.
- **Shadow Strategy:** Ambient Card at rest (see Elevation). Product cards hide overflow; top wells are Sky Mist with `object-fit: contain` product imagery.
- **Internal Padding:** 18–24px depending on density; summary/form cards use 24px.

### Inputs / Fields
- **Style:** `1px` border, 9px radius, white background, `11px 12px` padding, full-width inside form groups; textareas min-height 120px.
- **Focus:** teal border + `0 0 0 3px rgba(15,143,145,.13)` ring, 0.18s transition.
- **Error / Disabled:** red-tinted message banners (`#fff0f0`/`#a82b2b`) and green success banners (`#eafaf7`/`#12675e`).

### Navigation
- **Topbar:** Deep Blue strip, white small text, utility items.
- **Header:** sticky, surface white, hairline bottom border; logo (blue mark + 800-weight brand name) beside a pill search bar.
- **Nav strip:** hairline top border; items become Sky Mist + Trust Blue when active/hovered.
- **Mobile bottom nav (≤900px):** frosted translucent bar with muted icons that switch to teal/soft when active; mini-cart slides in from the right with a dark scrim.
- **Admin sidebar:** Deep Blue, white text; items get a translucent white active fill; the current page is always marked.

### Signature Component: Status Timeline
Order tracking uses a vertical timeline (`3px` border guide, padded-left) with teal dot markers ringed in white — synchronous, scannable progress delivery designed for the customer's main anxiety check.

## Do's and Don'ts

### Do:
- **Do** lead every region with one dominant primary action (Trust Blue) and let secondary/supporting actions ride behind it.
- **Do** state product/order status through tinted pills, never plain text in a table cell.
- **Do** keep one single warm accent (Safety Amber) rare enough that it still feels like a milestone when it appears.
- **Do** reserve monospace for codes (SKU, order number, invoice lines) and nothing else.
- **Do** keep product imagery on Sky Mist wells so `object-fit: contain` art floats cleanly off the page.
- **Do** collapse grids to single columns below ~640px and always expose quick actions on the smallest screens.
- **Do** write every surface also in dark mode, mapping surfaces to `#101820`/`#17232e` without losing teal accents.

### Don't:
- **Don't** introduce new hues outside the teal/blue/amber system without a real semantic reason — the palette is the trust.
- **Don't** make uppercase eyebrow or kicker text the loudest element; the headline owns the page.
- **Don't** use amber as a button or prominent region fill; it points, it doesn't carry.
- **Don't** add hard flat corners to interactive controls; radius tracks role (pill → 26px), buttons always ≥ 10px.
- **Don't** stack more than the two shadow stages; a third invented elevation dilutes the Lift-by-State distinction.
- **Don't** load webfonts; the system sans stack is the performance commitment.
- **Don't** claim real customer testimonials or service capacity in copy — demonstration content stays labeled as demo.