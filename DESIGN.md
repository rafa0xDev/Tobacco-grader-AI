# DESIGN.md — Tobacco AI Grader

A living reference for the visual design and UI structure of this project. Use this document when making changes to keep the look and feel consistent.

---

## Overview

**Tobacco AI Grader** is a browser-based tobacco leaf quality classification app powered by Google Teachable Machine and TensorFlow.js. The UI is a single-page dashboard that runs entirely in the browser — no build tools, no frameworks, no dependencies beyond the TF.js CDN scripts.

The design is inspired by the [UXBooster Modern Dashboard](https://v0.app/templates/uxbooster-modern-ux-analytics-dashboard-pHUEegzaKXu) template, adapted into plain HTML + CSS without any CSS framework.

---

## File Structure

```
/
├── index.html       # Main app — HTML structure
├── style.css        # All styles for the app
├── grader.js        # All JS logic (Teachable Machine, camera, UI updates)
└── about.html       # Standalone about page (if separated)
```

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| Shell background | `#c5c3d1` | Outer page background (lavender-gray) |
| App surface | `#f5f4f0` | Main container background (warm off-white) |
| Card background | `#ffffff` | All card surfaces |
| Card inner (muted) | `#f9fafb` | Prediction boxes, stat boxes, status box |
| Divider / track | `#f3f4f6` | Progress bar tracks, legend dividers |
| Grade A — Premium | `#16a34a` | Green — best quality |
| Grade B — Menengah | `#f59e0b` | Amber — mid quality |
| Grade C — Rendah | `#dc2626` | Red — low quality |
| Text primary | `#111827` | Headings, bold values |
| Text secondary | `#374151` | Body text |
| Text muted | `#6b7280` | Descriptions, labels |
| Text faint | `#9ca3af` | Placeholder text, log timestamps |

Grade colors are applied consistently across **all** UI elements that reference a grade: prediction text, probability bars, stat counters, distribution segments, and legend badges.

---

## Typography

| Font | Role | Weights |
|---|---|---|
| **Inter** | All UI text — labels, headings, descriptions | 400, 500, 600, 700 |
| **JetBrains Mono** | Data values — grade letter, confidence %, probabilities, log timestamps, status text | 400, 600, 700 |

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
```

**Rule:** anything that displays a live data value (a number, a grade letter, a percentage, a timestamp) uses `JetBrains Mono`. Everything else uses `Inter`.

---

## Layout

### Shell
The entire app sits inside a centered container with `max-width: 1024px`, `border-radius: 24px`, `background: #f5f4f0`, and a strong drop shadow. This gives the "floating card" look against the outer `#c5c3d1` background.

```css
.shell {
  max-width: 1024px;
  margin: 0 auto;
  background: #f5f4f0;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}
```

### Header
Sticky, with `backdrop-filter: blur(12px)` so content scrolls under it cleanly. Contains three zones:
- **Left** — leaf icon + app name (name hidden below 640px)
- **Center** — tab nav pills (Grader / Tentang)
- **Right** — live status pill + refresh button

### Content Grid
Two-column grid on desktop (≥1024px), single column on mobile. Left column: camera + data cards. Right column: stats + log cards.

```css
.grid-2col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 1024px) {
  .grid-2col { grid-template-columns: 1fr 1fr; }
}
```

---

## Cards

All cards share the same base style:

```css
.card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
```

No borders, no heavy shadows — just a very subtle `box-shadow` to lift cards off the `#f5f4f0` surface.

### Card inventory

| Card | ID / Class | Description |
|---|---|---|
| Kamera Live | `.camera-card` | Camera viewport + grade/confidence display |
| Distribusi Probabilitas | `.prob-card` | Three horizontal progress bars for A/B/C |
| Analisis Visual | — | Auto-generated text description + status monospace |
| Statistik Sesi | `.stats-card` | 3-column grid of session grade counts |
| Distribusi Grade | `.dist-card` | Segmented bar showing A/B/C proportion |
| Keterangan | — | Grade legend with colored badges |
| Log Sistem | — | Scrollable timestamped activity log |

---

## Camera Viewport

```css
.viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
  border-radius: 12px;
  background: #0f1f1a;   /* very dark green — "night vision" feel */
}
```

- Canvas injected by `grader.js` fills the viewport with `position:absolute; inset:0; width:100%; height:100%; object-fit:cover`
- Four corner bracket overlays in `#16a34a` (Grade A green) give a scanner/targeting feel
- Camera uses `facingMode: "environment"` (rear camera) via `getUserMedia`, overriding Teachable Machine's default front-camera behavior

---

## Interactive Elements

### Nav pills
```css
.nav-btn.active { background: #111827; color: #fff; }
.nav-btn        { background: transparent; color: #6b7280; }
```
Active state is a filled black pill. Inactive is transparent with muted text.

### Refresh button
Circular button (`36×36px`) with white background and subtle shadow. SVG icon spins via CSS animation while the model is loading:
```css
.refresh-btn.spinning svg { animation: spin 0.7s linear infinite; }
```

### Status dot
Pulses with CSS animation when camera is live:
```css
.status-dot.live {
  background: #16a34a;
  animation: pulse-dot 2s ease-in-out infinite;
}
```

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|---|---|
| `< 640px` | Body padding 8px. Brand name hidden. Status pill hidden. Single column. |
| `≥ 640px` | Body padding 16px. Brand name visible. Status pill visible. Features grid: 3 columns. |
| `≥ 768px` | Body padding 24px. |
| `≥ 1024px` | Content grid switches to 2 columns. |

---

## JS — Key Element IDs

These IDs are required by `grader.js` and must not be renamed without updating the script:

| ID | Element | Updated by |
|---|---|---|
| `webcam-container` | Camera viewport div | Canvas appended here on init |
| `camPlaceholder` | Loading placeholder | Hidden when camera starts |
| `predictionText` | Grade letter (A/B/C) | Each prediction cycle |
| `confValue` | Confidence percentage | Each prediction cycle |
| `barA` / `barB` / `barC` | Probability fill bars | Each prediction cycle |
| `pctA` / `pctB` / `pctC` | Probability percentage labels | Each prediction cycle |
| `descriptionText` | Auto-generated analysis text | Each grade change |
| `statusMessage` | Monospace status string | Each state change |
| `statusShort` | Short status in nav pill | Each state change |
| `statusDot` | Pulsing dot in nav pill | Camera on/off |
| `countA` / `countB` / `countC` | Session grade counters | Each grade change |
| `distA` / `distB` / `distC` | Distribution bar segments | Each grade change |
| `distPctA` / `distPctB` / `distPctC` | Distribution percentages | Each grade change |
| `logList` | Log entry list | Each log event |
| `refreshButton` | Refresh button | Click → restart camera |
| `label-container` | Hidden div | Teachable Machine compatibility |

---

## Design Decisions & Rationale

**Why plain HTML + CSS?**
The project is deployed on GitHub Pages as a static site. No Node.js, no build step, no framework. This keeps it simple, fast, and maintainable by a solo developer.

**Why a separate `style.css`?**
All styles are extracted into `style.css` and linked from `index.html`. This keeps the HTML clean and makes it easier to read and edit styles independently.

**Why JetBrains Mono for data values?**
Monospace fonts make numbers stable — digits don't shift layout as values change (e.g. `87%` vs `9%`). This is especially important for the probability bars where the percentage label sits next to a dynamic bar.

**Why `getUserMedia` instead of Teachable Machine's built-in webcam?**
`tmImage.Webcam` defaults to the front camera with mirroring. For a leaf grading app, the rear camera is essential. The workaround: init TM webcam normally, immediately replace the internal video stream with a `getUserMedia` rear-camera stream, then override `webcam.update()` to draw from that video element.

**Why count only on grade change, not every prediction frame?**
The model runs on every animation frame (~30fps). Counting every frame would flood the session stats. Instead, `lastGrade` tracks the previous grade and only increments when the grade changes.
