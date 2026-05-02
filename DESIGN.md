# Design System

Minimal, modern, dark-mode-first. Paste this into any project and tell an AI: "Follow DESIGN.md."

---

## Color Palette

All surfaces and tokens are defined for dark mode first. Light mode equivalents are noted where relevant.

### Base Surfaces

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `bg-base` | `#09090b` | `zinc-950` | Page background |
| `bg-surface` | `#18181b` | `zinc-900` | Cards, panels, sidebars |
| `bg-elevated` | `#27272a` | `zinc-800` | Dropdowns, tooltips, popovers |
| `bg-subtle` | `#3f3f46` | `zinc-700` | Hover states, dividers |

### Primary (Indigo)

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `primary` | `#6366f1` | `indigo-500` | CTAs, active states, links |
| `primary-hover` | `#818cf8` | `indigo-400` | Hover on primary |
| `primary-muted` | `#312e81` | `indigo-900` | Subtle primary backgrounds |
| `primary-foreground` | `#ffffff` | `white` | Text on primary buttons |

### Secondary (Violet)

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `secondary` | `#a78bfa` | `violet-400` | Accents, tags, highlights |
| `secondary-muted` | `#2e1065` | `violet-950` | Subtle secondary backgrounds |

### Neutrals (Text & Borders)

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `text-primary` | `#fafafa` | `zinc-50` | Body text, headings |
| `text-secondary` | `#a1a1aa` | `zinc-400` | Subtext, labels, captions |
| `text-muted` | `#71717a` | `zinc-500` | Placeholders, disabled |
| `border` | `#3f3f46` | `zinc-700` | Default borders |
| `border-subtle` | `#27272a` | `zinc-800` | Hairline separators |

### Semantic Colors

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `success` | `#22c55e` | `green-500` | Confirmations, valid states |
| `success-muted` | `#14532d` | `green-900` | Success background badges |
| `error` | `#ef4444` | `red-500` | Errors, destructive actions |
| `error-muted` | `#7f1d1d` | `red-900` | Error background badges |
| `warning` | `#f59e0b` | `amber-500` | Warnings, caution states |
| `warning-muted` | `#78350f` | `amber-900` | Warning background badges |
| `info` | `#3b82f6` | `blue-500` | Informational messages |
| `info-muted` | `#1e3a5f` | `blue-950` | Info background badges |

### Light Mode Overrides (when needed)

| Dark token | Light equivalent |
|---|---|
| `bg-base` → `#ffffff` | `zinc-50` for surfaces |
| `bg-surface` → `#f4f4f5` | `zinc-100` |
| `text-primary` → `#09090b` | `zinc-950` |
| `text-secondary` → `#52525b` | `zinc-600` |
| `border` → `#e4e4e7` | `zinc-200` |

---

## Typography

**Font stack:**
- Sans: `Inter, system-ui, -apple-system, sans-serif`
- Mono: `JetBrains Mono, 'Fira Code', 'Cascadia Code', monospace`

Load via Google Fonts: `Inter` (weights 400, 500, 600, 700) + `JetBrains+Mono` (weight 400).

### Type Scale

| Step | Size | Tailwind | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| `xs` | 12px | `text-xs` | 400 | 1.5 | Captions, timestamps, badges |
| `sm` | 14px | `text-sm` | 400 | 1.5 | Body small, labels, helper text |
| `base` | 16px | `text-base` | 400 | 1.6 | Default body copy |
| `lg` | 18px | `text-lg` | 500 | 1.5 | Lead paragraphs |
| `xl` | 20px | `text-xl` | 600 | 1.4 | Card titles, section headers |
| `2xl` | 24px | `text-2xl` | 600 | 1.3 | Page subheadings |
| `3xl` | 30px | `text-3xl` | 700 | 1.2 | Section headings |
| `4xl` | 36px | `text-4xl` | 700 | 1.1 | Page titles |
| `5xl` | 48px | `text-5xl` | 700 | 1.0 | Hero headings |
| `6xl` | 60px | `text-6xl` | 700 | 1.0 | Display headings |

### Font Weights

| Name | Value | Tailwind | Usage |
|---|---|---|---|
| Regular | 400 | `font-normal` | Body text |
| Medium | 500 | `font-medium` | Labels, nav items |
| Semibold | 600 | `font-semibold` | Headings, button labels |
| Bold | 700 | `font-bold` | Display text, strong emphasis |

---

## Spacing System

Base unit: **4px**. All spacing derived from this grid.

| Token | px | Tailwind | Common usage |
|---|---|---|---|
| `1` | 4px | `p-1 / m-1` | Icon padding, tight gaps |
| `2` | 8px | `p-2 / m-2` | Badge padding, small gaps |
| `3` | 12px | `p-3 / m-3` | Input padding (y-axis) |
| `4` | 16px | `p-4 / m-4` | Default component padding |
| `5` | 20px | `p-5 / m-5` | Card padding (compact) |
| `6` | 24px | `p-6 / m-6` | Card padding (default) |
| `8` | 32px | `p-8 / m-8` | Section padding (small) |
| `10` | 40px | `p-10 / m-10` | Section gaps |
| `12` | 48px | `p-12 / m-12` | Section padding (medium) |
| `16` | 64px | `p-16 / m-16` | Section padding (large) |
| `20` | 80px | `p-20 / m-20` | Page section vertical rhythm |
| `24` | 96px | `p-24 / m-24` | Hero padding |

**Rule:** Never use arbitrary spacing values. Snap to the nearest scale step.

---

## Border Radius

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `none` | 0px | `rounded-none` | Sharp elements, dividers |
| `sm` | 4px | `rounded-sm` | Badges, tags, small chips |
| `DEFAULT` | 8px | `rounded` | Inputs, buttons (default) |
| `md` | 12px | `rounded-md` | Cards, modals, dropdowns |
| `lg` | 16px | `rounded-lg` | Large cards, panels |
| `xl` | 24px | `rounded-xl` | Feature cards, hero sections |
| `2xl` | 32px | `rounded-2xl` | Hero images, big containers |
| `full` | 9999px | `rounded-full` | Avatars, pills, icon buttons |

---

## Shadow Scale

All shadows use dark, desaturated tones for dark-mode legibility. Light shadows are near-black with low opacity.

| Token | Tailwind | CSS value | Usage |
|---|---|---|---|
| `shadow-xs` | `shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle lift (inputs on hover) |
| `shadow-sm` | `shadow` | `0 2px 8px rgba(0,0,0,0.5)` | Cards, buttons |
| `shadow-md` | `shadow-md` | `0 4px 16px rgba(0,0,0,0.6)` | Dropdowns, popovers |
| `shadow-lg` | `shadow-lg` | `0 8px 32px rgba(0,0,0,0.7)` | Modals, drawers |
| `shadow-xl` | `shadow-xl` | `0 16px 48px rgba(0,0,0,0.8)` | Floating panels |
| `shadow-glow` | custom | `0 0 24px rgba(99,102,241,0.3)` | Primary accent glow on focus |

---

## Component Patterns

### Buttons

**Primary**
```html
<button class="inline-flex items-center gap-2 px-4 py-2 rounded bg-indigo-500 
  text-white text-sm font-semibold hover:bg-indigo-400 active:bg-indigo-600 
  transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed">
  Label
</button>
```

**Secondary (outlined)**
```html
<button class="inline-flex items-center gap-2 px-4 py-2 rounded border border-zinc-700 
  text-zinc-200 text-sm font-semibold hover:bg-zinc-800 active:bg-zinc-700 
  transition-colors duration-150">
  Label
</button>
```

**Ghost**
```html
<button class="inline-flex items-center gap-2 px-4 py-2 rounded text-zinc-400 
  text-sm font-medium hover:bg-zinc-800 hover:text-zinc-100 
  transition-colors duration-150">
  Label
</button>
```

**Destructive**
```html
<button class="inline-flex items-center gap-2 px-4 py-2 rounded bg-red-500 
  text-white text-sm font-semibold hover:bg-red-400 active:bg-red-600 
  transition-colors duration-150">
  Delete
</button>
```

**Icon button**
```html
<button class="p-2 rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 
  transition-colors duration-150">
  <!-- icon svg here -->
</button>
```

**Sizes:** swap padding — `px-3 py-1.5 text-xs` (sm) · `px-4 py-2 text-sm` (default) · `px-5 py-2.5 text-base` (lg)

---

### Inputs

**Text input**
```html
<div class="flex flex-col gap-1.5">
  <label class="text-sm font-medium text-zinc-300">Label</label>
  <input type="text" placeholder="Placeholder"
    class="w-full px-3 py-2 rounded bg-zinc-800 border border-zinc-700 
    text-zinc-100 text-sm placeholder:text-zinc-500 
    focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 
    transition-colors duration-150" />
  <p class="text-xs text-zinc-500">Helper text</p>
</div>
```

**Error state:** replace border/ring with `border-red-500 ring-red-500`, add `<p class="text-xs text-red-400">Error message</p>`.

**Textarea:** same classes, use `<textarea rows="4" class="resize-none ..." />`.

**Select:** same classes as input, add `appearance-none` and a custom chevron icon.

---

### Cards

**Default**
```html
<div class="rounded-md bg-zinc-900 border border-zinc-800 p-6 shadow">
  <h3 class="text-base font-semibold text-zinc-100">Card Title</h3>
  <p class="mt-1 text-sm text-zinc-400">Supporting description text goes here.</p>
</div>
```

**Interactive (clickable)**
```html
<div class="rounded-md bg-zinc-900 border border-zinc-800 p-6 shadow 
  cursor-pointer hover:border-zinc-600 hover:bg-zinc-800/60 
  transition-colors duration-150">
  ...
</div>
```

**Featured (with accent border)**
```html
<div class="rounded-md bg-zinc-900 border border-indigo-500/40 p-6 shadow-lg 
  ring-1 ring-indigo-500/20">
  ...
</div>
```

---

### Badges

```html
<!-- Neutral -->
<span class="inline-flex items-center px-2 py-0.5 rounded-sm bg-zinc-800 
  text-zinc-300 text-xs font-medium">Label</span>

<!-- Primary -->
<span class="inline-flex items-center px-2 py-0.5 rounded-sm bg-indigo-900 
  text-indigo-300 text-xs font-medium">Label</span>

<!-- Success -->
<span class="inline-flex items-center px-2 py-0.5 rounded-sm bg-green-900 
  text-green-400 text-xs font-medium">Success</span>

<!-- Error -->
<span class="inline-flex items-center px-2 py-0.5 rounded-sm bg-red-900 
  text-red-400 text-xs font-medium">Error</span>

<!-- Warning -->
<span class="inline-flex items-center px-2 py-0.5 rounded-sm bg-amber-900 
  text-amber-400 text-xs font-medium">Warning</span>
```

---

### Modals

```html
<!-- Backdrop -->
<div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4">
  <!-- Panel -->
  <div class="w-full max-w-md rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl z-50">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
      <h2 class="text-base font-semibold text-zinc-100">Modal Title</h2>
      <button class="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 
        transition-colors duration-150">✕</button>
    </div>
    <!-- Body -->
    <div class="px-6 py-4 text-sm text-zinc-400">
      Content goes here.
    </div>
    <!-- Footer -->
    <div class="flex justify-end gap-2 px-6 py-4 border-t border-zinc-800">
      <button class="px-4 py-2 rounded border border-zinc-700 text-zinc-300 text-sm 
        hover:bg-zinc-800 transition-colors duration-150">Cancel</button>
      <button class="px-4 py-2 rounded bg-indigo-500 text-white text-sm font-semibold 
        hover:bg-indigo-400 transition-colors duration-150">Confirm</button>
    </div>
  </div>
</div>
```

---

### Dropdowns / Popovers

```html
<div class="absolute z-50 mt-1 w-48 rounded-md bg-zinc-800 border border-zinc-700 
  shadow-lg py-1 origin-top-right">
  <a href="#" class="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 
    hover:text-zinc-100 transition-colors duration-100">Item</a>
  <div class="my-1 border-t border-zinc-700"></div>
  <a href="#" class="block px-4 py-2 text-sm text-red-400 hover:bg-zinc-700 
    transition-colors duration-100">Destructive</a>
</div>
```

---

### Alerts / Toasts

```html
<!-- Info -->
<div class="flex gap-3 p-4 rounded-md bg-blue-950 border border-blue-800 text-blue-300 text-sm">
  <span>ℹ</span>
  <p>Informational message here.</p>
</div>

<!-- Success -->
<div class="flex gap-3 p-4 rounded-md bg-green-900 border border-green-700 text-green-300 text-sm">
  <span>✓</span>
  <p>Action completed successfully.</p>
</div>

<!-- Error -->
<div class="flex gap-3 p-4 rounded-md bg-red-900 border border-red-700 text-red-300 text-sm">
  <span>✕</span>
  <p>Something went wrong.</p>
</div>
```

---

## Layout Rules

### Breakpoints (Tailwind defaults)

| Name | Min-width | Usage |
|---|---|---|
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Wide screens |

### Max-widths

| Context | Class | px | Usage |
|---|---|---|---|
| Prose / articles | `max-w-2xl` | 672px | Long-form reading content |
| Forms | `max-w-md` | 448px | Auth forms, settings forms |
| Modals | `max-w-md` | 448px | Standard modal width |
| App content | `max-w-5xl` | 1024px | Dashboard/app layouts |
| Marketing | `max-w-7xl` | 1280px | Landing pages, wide layouts |

### Page Layout Shell

```html
<div class="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
  <!-- Top nav -->
  <header class="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
      ...
    </div>
  </header>

  <!-- Main content -->
  <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
    ...
  </main>
</div>
```

### Grid System

```html
<!-- 12-column auto-responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">...</div>

<!-- Sidebar layout -->
<div class="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">...</div>

<!-- Two-column even -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">...</div>
```

**Rule:** Use `gap-4` (16px) for tight grids, `gap-6` (24px) for cards, `gap-8` (32px) for page sections.

---

## Animation & Transition Defaults

### Transition Utilities

| Purpose | Classes |
|---|---|
| Color/background | `transition-colors duration-150 ease-in-out` |
| Opacity | `transition-opacity duration-200 ease-in-out` |
| Transform (hover lift) | `transition-transform duration-200 ease-out` |
| All properties | `transition-all duration-200 ease-in-out` |
| Shadow | `transition-shadow duration-200 ease-in-out` |

**Rule:** Use `150ms` for micro-interactions (hover, focus). Use `200–300ms` for state changes (open/close, appear). Never exceed `400ms` for UI transitions.

### Common Patterns

**Hover lift (cards):**
```html
class="transition-transform duration-200 hover:-translate-y-0.5"
```

**Fade in (modals/toasts):**
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 200ms ease-out forwards; }
```

**Scale in (dropdowns):**
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
.animate-scale-in { animation: scaleIn 150ms ease-out forwards; }
```

**Pulse (loading skeleton):**
```html
class="animate-pulse bg-zinc-800 rounded"
```

---

## Quick Reference for AI Prompts

When instructing an AI to follow this system, include:

> Follow DESIGN.md. Dark backgrounds use zinc-950/900/800. Primary accent is indigo-500. All text is zinc-50/400/500. Spacing snaps to the 4px scale. Border radius: 8px default, 12px for cards/modals. Transitions are 150ms for hover, 200ms for state changes. Use Inter for sans, JetBrains Mono for code. Component patterns (buttons, inputs, cards, modals) are defined in DESIGN.md — match them exactly.
