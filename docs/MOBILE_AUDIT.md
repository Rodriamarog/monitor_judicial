# Mobile UI/UX Audit

**Date:** 2026-06-10  
**Scope:** All dashboard pages and major components  
**Goal:** Identify mobile breakage without touching desktop layout

---

## Critical — Completely Broken on Mobile

### 1. AI Assistant — `app/dashboard/ai-assistant/ai-assistant-content.tsx`

- **Line 614:** `p-6` padding on all sides on mobile (24px eats width)
- **Line 615:** `flex gap-4 h-full` — rigid 3-pane horizontal row, no `flex-col` fallback
- **Line 616:** `w-80 flex flex-col` conversations sidebar (320px) — no `hidden md:flex`
- **Line 868:** `w-96 h-full` sources sidebar (384px) — no `hidden md:flex`
- **Line 735:** `grid-cols-2` example prompts — no mobile single-column fallback
- **Extra:** The `pt-16` offset that clears the hamburger button is skipped on the AI Assistant page, so the hamburger overlaps the chat header on mobile

**Result:** Chat area gets ~0px width on a 375px phone. Completely unusable.

---

### 2. Tesis Buscador — `app/dashboard/tesis/tesis-content.tsx`

- **Line 202:** `flex gap-6 h-full` — horizontal flex row with no `flex-col md:flex-row`
- **Line 204:** `w-80 flex-shrink-0` filter panel always visible (320px) — no `hidden md:flex`
- **Lines 322–365:** Year inputs use `w-20` with no `min-w-0` guard

**Result:** Filter panel eats entire viewport, results pane gets ~31px. Completely unusable.

---

### 3. Expediente Modal Balance Tab — `components/expediente-modal.tsx`

- **Line 537:** `max-w-7xl h-[90vh]` dialog — layout inside breaks on mobile
- **Line 548:** `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` info grid — on mobile, juzgado names (very long) are hard-clipped in ~140px cells
- **Line 948:** `grid-cols-[300px_1fr]` hardcoded — 300px left column leaves ~27px for payments table on mobile
- **Lines 912–929:** File action buttons `h-8 w-8 p-0` (32px touch target)
- **Lines 1036–1055:** Payment action buttons `h-8 w-8 p-0` (32px touch target)
- **Line 1132:** Nested file preview dialog `max-w-5xl h-[85vh]` inside an already-open modal — z-index and scroll conflicts on mobile; iframe PDF has no mobile fallback

---

### 4. Cases Table — `components/cases-table.tsx`

- **Line 231:** `w-60` Nombre column (240px)
- **Line 232:** `w-20` Expediente column (80px)
- **Line 233:** `w-32` Teléfono column (128px)
- **Line 234:** `w-64` Juzgado column (256px)
- **Line 235:** `w-28` Balance column (112px)
- Combined declared widths ~816px+ on a 375px viewport. No columns have `hidden sm:` guards.
- **Lines 340–360:** Action buttons `h-8 w-8 p-0` (32px touch target)
- **Lines 63–90:** `calculateTableHeight` uses fixed pixel constants against `window.innerHeight` without accounting for mobile browser chrome (dynamic address bar)

---

### 5. Alerts Table Expanded Rows — `components/alerts-table.tsx`

- **Line 144:** `table-fixed` + `w-[400px]` Juzgado column hidden on mobile, but remaining columns leave ~115px for case names
- **Line 142:** `w-[130px]` date column always visible, takes 35% of 375px viewport
- **Lines 276–342:** Expanded detail rows use `max-h-[1000px]` with no `overflow-y-auto` — long `raw_text` breaks virtual scroll layout

---

## Major — Severely Degraded

### 6. Dashboard Main Padding — `components/dashboard-main.tsx`

- **Line 18:** `p-8 pt-16 md:pt-8` — `p-8` (32px) horizontal padding applies on mobile with no reduction. On a 375px screen, 64px is lost to horizontal padding.

---

### 7. Calendar — `app/dashboard/calendar/calendar-content.tsx` + `components/calendar-app.tsx`

- **Line 83 (calendar-content):** Default view always `month` — never switches to `agenda` on mobile
- **Lines 411–444:** `react-big-calendar` month view renders 7 columns on ~327px content area (~46px per day cell). Toolbar buttons overflow on narrow screens.
- **Line 141 (calendar-app):** `lg:grid-cols-[280px_1fr]` — no intermediate `md:` breakpoint; between 768–1023px the mini-calendar stacks vertically and takes enormous vertical space
- **Line 227 (calendar-app):** `min-h-[100px]` per day cell in custom calendar — in 7-column layout on mobile, content area per cell is ~30px after padding

---

### 8. Investigación Header — `app/dashboard/investigacion/page.tsx`

- **Line 383:** `w-64` (256px) fixed-width search input inside a `flex items-center justify-between` row — no `w-full sm:w-64` or `flex-col sm:flex-row` pattern. Overflows on 375px screen.

---

### 9. Busquedas Estatales — `components/busquedas-estatales-client.tsx`

- **Lines 252–259:** `absolute right-0 top-0` Historial button overlaps the `text-center` title on narrow screens
- **Line 511:** Results dialog `max-w-4xl` — inner `grid-cols-2` search summary (line 535) doesn't collapse on mobile
- **Line 628:** PDF preview dialog `max-w-5xl h-[90vh]` — iframe-based `PDFViewer` has no mobile-friendly fallback

---

## Moderate — Degraded but Functional

### 10. Touch Targets Throughout

All instances of `h-8 w-8 p-0` buttons (32px) — below the 44px minimum recommended touch target:
- `components/cases-table.tsx` lines 340–360
- `components/expediente-modal.tsx` lines 912–929 (files tab)
- `components/expediente-modal.tsx` lines 1036–1055 (payments tab)
- `components/alerts-table.tsx` action buttons

Sidebar/navigation buttons:
- `components/app-sidebar.tsx` line 201: `size="icon"` hamburger = 36×36px
- `components/app-sidebar.tsx` line 224: `h-6 w-6` collapse toggle = 24px
- `components/sidebar.tsx` line 156: `h-6 w-6` collapse toggle = 24px

---

### 11. Dialog Internal Grids

- `components/add-case-dialog.tsx` line 400: `grid-cols-2` balance fields — no mobile single-column fallback (~135px per column inside dialog on mobile)
- `components/edit-case-dialog.tsx` line 281: same `grid-cols-2` pattern
- `components/busquedas-estatales-client.tsx` line 535: `grid-cols-2` search summary inside results dialog

---

### 12. Auth Pages — `app/login/page.tsx` + `app/signup/page.tsx`

- **Line 117 (login):** Forgot password link is `text-xs` (12px) with no padding — untappable on mobile
- **Line 80 (login) / line 124 (signup):** `p-8 lg:p-16` — 32px padding on mobile, content area 311px (acceptable but tight)

---

### 13. Alerts Page Filters — `app/dashboard/alerts/page.tsx`

- **Lines 439–485:** Quick filter buttons (`Hoy`, `Últimos 7 días`, etc.) use `size="sm"` = 32px height
- **Line 330:** `avoidCollisions={false}` on filter popover — can overflow off bottom of screen on mobile without repositioning

---

## Minor

### 14. Pricing Grid — `app/pricing/pricing-section.tsx`

- **Line 67:** `md:grid-cols-2 lg:grid-cols-5` — jumps from 2 to 5 columns with no intermediate step; 5 cards in 2-column layout leaves one card orphaned

---

### 15. Overview Dashboard — `components/overview-dashboard-client.tsx`

- **Line 92:** `text-3xl` heading with no responsive size reduction (`sm:text-2xl`)
- **Line 139:** `md:grid-cols-2 lg:grid-cols-5` — no `md:grid-cols-3` intermediate step

---

## Fix Strategy

Since the desktop layout must not change, all fixes should follow these patterns:

| Pattern | Tailwind |
|---|---|
| Stack on mobile, row on desktop | `flex flex-col md:flex-row` |
| Hide panel on mobile, show on desktop | `hidden md:flex` |
| Show mobile-only alternative | `md:hidden` |
| Reduce padding on mobile | `p-4 md:p-8` |
| Increase touch targets without affecting desktop | `min-h-[44px] md:min-h-[32px]` |
| Stack grid columns on mobile | `grid-cols-1 md:grid-cols-2` |

---

## Priority Order for Implementation

1. **AI Assistant** — completely broken, highest-impact fix
2. **Tesis Buscador** — completely broken
3. **Cases Table** — most-used feature, broken horizontal scroll
4. **Expediente Modal Balance Tab** — hardcoded pixel grid
5. **Calendar** — needs mobile-first default view
6. **Dashboard padding** — global win, one-line fix
7. **Touch targets** — quick wins across all tables
8. **Auth pages** — low effort, high polish impact
9. **Dialogs internal grids** — medium effort
10. **Alerts filters** — minor polish
