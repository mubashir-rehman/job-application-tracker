# HireTrack — Design Revamp (Native Experience, All Platforms)

> Status: **Design / proposed.** Goal: feel like a native app, not a website. **Desktop first, then mobile.**
> Visual identity is finalized during D1 using the `frontend-design` skill; this doc sets direction + architecture.

## Brief (grounding the design)
**Subject:** a job-seeker's command center — a *pipeline* you move candidacies through. **Audience:** one power user (you), running many applications in parallel, who values low cognitive load and honesty over decoration. **The page's job:** show where every application stands and let you act on the next one fast. The product's own world is the **pipeline** (stages, motion forward, gates) — that metaphor, not generic dashboard cards, is where the distinctive choices come from.

## Anti-template guardrails
Do **not** default to the three AI-design clichés (cream + serif + terracotta · near-black + single acid accent · broadsheet hairline columns). HireTrack already has an indigo glass-twilight identity — evolve it into a disciplined system rather than restarting. Spend boldness in **one** signature element (below); keep everything else quiet.

## Signature element
The **pipeline rail**: a persistent, spatial representation of the 7-phase funnel that a candidacy literally advances along — used as the detail-view spine on desktop and the progress affordance on mobile. It encodes real sequence (so numbered/stepped markers are *earned* here, unlike decorative numbering elsewhere). Forward motion = progress; this is the one memorable, brief-specific moment.

## Design system (D1)
- **Tokens:** formalize spacing, radius, elevation, motion-duration, and color into CSS variables (extend the existing `--bg-*`, `--glass-*`). Single source for both themes.
- **Light/dark parity:** fix the "light-mode glass nearly invisible" defect (flagged in Phase 1 + the resume work) at the token level — light mode gets its own glass blend/border values, not a washed-out copy of dark.
- **Type scale:** keep Space Grotesk (display) / Inter (body) / JetBrains Mono (data), but set an intentional scale with deliberate weights + tracking; make data (salary, dates, match %) feel instrument-like in mono.
- **Component library:** one canonical set (Button, Card, Sheet, Table, Field, Badge, Toast, CommandItem) so the card/alignment/date inconsistencies seen in the resume iterations can't recur.
- **Quality floor (non-negotiable):** visible keyboard focus, `prefers-reduced-motion` respected, `prefers-color-scheme` honored, responsive down to mobile, safe-area insets.

## Adaptive shell (not just responsive reflow)
A `usePlatform()` / breakpoint hook branches into two genuinely different layouts:

**Desktop (D2 — build first)**
```
┌──────────┬───────────────────────────┬───────────────────────┐
│ Sidebar  │  List (applications)      │  Detail pane          │
│ nav      │  dense, sortable table    │  pipeline rail (sig.) │
│ + ⌘K     │  inline status            │  resume · contacts ·  │
│          │                           │  outreach · prep      │
└──────────┴───────────────────────────┴───────────────────────┘
  • 3-pane (list + detail), no full-screen modals for primary flows
  • ⌘K command palette (cmdk) — new application, jump to company, run pipeline stage
  • full keyboard nav (j/k, enter, e, shortcuts), resizable panes
  • hover affordances, dense data tables
```

**Mobile (D5 — after desktop)**
```
┌───────────────────────────┐
│        Content            │
│   stacked, single column  │
│   pipeline rail = top      │
│   progress affordance      │
│                           │
│        [ + ] FAB          │
├───────────────────────────┤
│  ▣ Apps  ◑ Pipeline  ☰    │  ← bottom tab bar
└───────────────────────────┘
  • bottom-sheets (vaul) instead of center modals
  • swipe gestures (advance phase / archive), pull-to-refresh
  • safe-area insets for notches
```

## PWA (D4)
Installable (manifest + icons), standalone display, service worker for offline — pairs with the local-first resume source + localStorage mirror so the app is usable app-like, launched from dock/home screen. (True native binaries via Tauri/Capacitor are an optional later step; PWA delivers the "native experience" without a rewrite.)

## Motion
Deliberate, not scattered. One orchestrated moment: advancing a candidacy along the pipeline rail (spring, satisfying, forward). Elsewhere — quiet: skeleton loaders, optimistic transitions, hover micro-interactions. All gated by `prefers-reduced-motion`. Avoid ambient animation that reads as AI-generated filler.

## Copy
Active voice, sentence case, end-user vocabulary. An action keeps its name across the flow ("Approve" → toast "Approved"). Empty states invite the next action ("No applications yet — paste a job description to start."). Errors say what happened + how to fix, in the interface's voice.

## Tech
React 19 · Tailwind v4 · `motion` (existing) + `cmdk` (palette) + `vaul` (sheets) + container queries. No framework change.

## Build order
**D1** tokens + light/dark fix + component primitives → **D2** desktop adaptive shell (3-pane, pipeline rail, ⌘K, keyboard) → **D3** migrate existing views (slide-over → detail pane; modals → adaptive) → **D4** PWA → **D5** mobile shell (bottom nav, sheets, gestures) → **D6** polish + a11y (clears much of the Phase 1 backlog).

> All new pipeline UI (intake, approval gate, knowledge-bank dashboard) is built **into this shell** — which is why D1–D2 land before pipeline UI work.
