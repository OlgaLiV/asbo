---
version: alpha
name: Olga-Portfolio-Midnight-Blueprint
description: A long, cinematic one-page portfolio for Olga (AI Studio by Olga). It opens on a midnight-navy blueprint canvas with oversized, tightly tracked grotesk headlines and small monospace labels, then turns to pale paper for the project stories and the founder bio. One bright accent, the logo's cyan, is used sparingly. Navigation lives in a floating dock at the bottom of the screen.
sources:
  - Structure and rhythm inspired by roomandpillar.com (layout ideas only, no copy or imagery reused)
  - Dark-half rules adapted from awesome-design-md / linear.app/DESIGN.md (MIT, VoltAgent)
  - Light-half reading rules adapted from awesome-design-md / claude/DESIGN.md (MIT, VoltAgent)
  - Colours from the AI Studio by Olga logo

colors:
  night: "#12152A"          # dark sections
  night-raised: "#1E2344"   # dock, dark cards
  night-line: "#2C3360"     # borders on dark
  on-night: "#F2F2F6"       # text on dark
  on-night-muted: "#9A9DB8" # secondary text on dark
  paper: "#F3F2F7"          # light sections
  card: "#FFFFFF"
  ink: "#12152A"            # text on light
  ink-muted: "#545871"
  rule: "#D9D8E4"           # hairlines on light
  periwinkle: "#5E6DA8"     # logo field: grid dots, blueprint lines, labels
  periwinkle-ink: "#2F3A6B" # italic emphasis on light
  cyan: "#00E3F8"           # the one accent: primary buttons, active states
  cyan-ink: "#0B7488"       # cyan as text on light
  coral: "#E0643A"          # tiny details only (status dots)
  magenta: "#B21F71"        # TODO tags only

typography:
  display: { fontFamily: "Geist", weight: 600, letterSpacing: "-0.055em", lineHeight: 0.95 }
  heading: { fontFamily: "Geist", weight: 600, letterSpacing: "-0.04em" }
  body: { fontFamily: "Geist", weight: 400, size: "17px", lineHeight: 1.6 }
  label: { fontFamily: "Geist Mono", weight: 400, size: "12px", transform: uppercase, letterSpacing: "0.06em" }
  voice: { fontFamily: "Cormorant Garamond", style: italic, use: "one emphasised word per heading, and the signature" }

rounded: { sm: 6px, md: 10px, lg: 14px, pill: 999px }
---

## Rules

1. **One accent.** Cyan appears only on the primary action (Book a Free Consultation), the dock arrow and active states. Text on cyan is always `{colors.night}`, never white.
2. **Dark first, then paper.** Hero, statement and approach are on `{colors.night}`. The page turns to `{colors.paper}` at "Selected work" and stays light through the bio, then returns to night for the contact band and footer.
3. **Blueprint frames, not boxes.** Feature blocks sit inside 1px `{colors.night-line}` frames with small dots at the corners and a faint periwinkle dot grid behind them. Cards are used only for project mock-ups.
4. **Labels in brackets.** Section labels are monospace, uppercase, wrapped in `[ ]`.
5. **Real work, not props.** Imagery is real screenshots or UI mock-ups of Olga's projects. No 3D rocks, stock photos or abstract AI graphics.
6. **Honest copy.** Anything not yet confirmed by Olga carries a visible magenta `TODO` tag. Illustrative mock-ups say so.
7. **Motion.** One hero entrance, the statement paragraph lighting up word by word as it scrolls, and hover states. Everything is switched off under `prefers-reduced-motion`.
8. **Navigation.** A floating dock at the bottom: menu button, logo mark, cyan arrow to Calendly. The menu opens upward and closes on Escape or a link click.
