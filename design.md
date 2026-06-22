# Design — DocMate

A locked design system for DocMate. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
modern-minimal

## Macrostructure family
- App pages: Workbench (the doc surface IS the primary content; chat is the side rail)
- Single-screen app, no marketing pages — no footer, no marketing nav.

## Theme
- `--color-paper`      oklch(98.5% 0.004 250)  — cool-engineered near-white
- `--color-paper-2`    oklch(96.5% 0.005 252)  — alt band / chat bubble (ai)
- `--color-paper-3`    oklch(94% 0.006 254)    — card tint
- `--color-ink`        oklch(24% 0.02 258)     — headlines + wordmark
- `--color-ink-2`      oklch(34% 0.018 257)    — body copy
- `--color-muted`      oklch(52% 0.013 255)    — captions, meta
- `--color-rule`       oklch(91% 0.008 255)    — hairlines
- `--color-rule-2`     oklch(83% 0.011 255)    — stronger hairline / hover rule
- `--color-accent`     oklch(55% 0.21 256)     — electric cobalt (the ONE signal)
- `--color-accent-ink` oklch(99% 0.004 256)    — text on cobalt
- `--color-accent-dim` oklch(55% 0.21 256 / 0.10) — focus halo, active chip wash
- `--color-amber-accent` oklch(70% 0.16 75)    — scoped to "editing selection" banner ONLY

Dark mode: same hue (256), lifted lightness per Hallmark dark-mode recipe.
See `tokens.css` for the full dark-mode values.

## Typography
- Display: Space Grotesk 600/700, roman, tracking -0.025em
- Body:    Inter 400/500/600, tracking -0.01em
- Mono:    JetBrains Mono 400/500, tracking 0.06em on uppercase labels
- Display tracking: -0.025em
- Type scale anchor: major third (1.25)

2+1 rule: display + body + mono. Mono appears only on:
- Eyebrow labels (CHAT, OPENROUTER, AUTO-INSERT, EDITING SELECTION)
- Code blocks
- Provider chip + model name
- Keyboard hints (↵ SEND · ⇧↵ NEWLINE)

No italic headers anywhere. Italic survives only as inline emphasis in body prose.

## Spacing
4-point named scale. The values are in `tokens.css`. Pages must use named
tokens (`var(--space-md)`), never raw values.

## Motion
- Easings: `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) is the only easing.
- Durations: short=160ms, med=220ms, long=400ms.
- Reveal pattern: none — the page is composed, not animated in.
- Reduced-motion fallback: opacity-only, ≤150ms. Already enforced in globals.css.

## Microinteractions stance
- Silent success — no celebratory toasts on insert; just a small cobalt "Inserted" tag.
- Hover delay 800ms on tooltips (handled by TooltipProvider delayDuration).
- Focus delay 0ms on tooltips.
- Optimistic update on the chat Send button (label changes to "Replace" when selection active).

## CTA voice
- Primary CTA: filled cobalt background, cobalt-ink text, tight 6px radius, mono uppercase label
  e.g. `SEND`, `REPLACE`, `STOP`. No celebratory shadows, no hover scale.
- Secondary CTA: ghost, transparent, muted-foreground text, hover lifts to paper-2 background.
- Chips: hairline border, mono 11px uppercase, hover border darkens to rule-2.

## Per-page allowances
- App pages: NO enrichment. Function carries the page. No hero illustration, no aurora blobs.
- The doc surface itself IS the primary visual content.

## What pages MUST share
- The wordmark (Space Grotesk 600 + tiny cobalt square).
- The cobalt accent and its placement (≤3% of viewport per Hallmark discipline).
- The Space Grotesk + Inter + JetBrains Mono pairing.
- The CTA voice (tight 6px radius, mono uppercase labels).
- The hairline border language (1px var(--color-rule) everywhere).

## What pages MAY differ on
- Macrostructure within the app family (chat panel can dock left or right).
- Toolbar icon density (compact on mobile, full on desktop).

## Anti-patterns enforced (from Hallmark slop-test)
- ✅ No pure black/white — every neutral tinted toward hue 256
- ✅ No side-stripe cards — AI inserts get a small cobalt square anchor + hairline left border
- ✅ No purple-to-cyan gradients — zero gradients anywhere
- ✅ No italic headers
- ✅ No aurora blobs / floating orbs
- ✅ No fake browser chrome around the doc
- ✅ No "3-column feature grid" — this is an app, not a landing page
- ✅ No gradient text on headings
- ✅ No glassmorphism — opaque surfaces with hairline borders only
- ✅ Tabular nums on the message count and any numeric data

## Exports

### tokens.css
See `/tokens.css` at the project root.

### Tailwind v4 `@theme`
Already wired in `src/app/globals.css` via `@theme inline` — maps Hallmark tokens
to Tailwind's color tokens (background, foreground, primary, etc.) so all
shadcn/ui components inherit the Cobalt voice automatically.
