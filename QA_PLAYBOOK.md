# ASBO QA Playbook

ASBO-specific adaptation of Olga's *Universal AI Project Playbook* (§05 mobile-first, §06 quality,
§10 change procedure, §11 release). Track: marketing website + AI layer (the ASBO assistant).

## 1. What applies to ASBO

| Playbook rule | Applies? | How it shows up here |
|---|---|---|
| Owner decides; never claim unrun checks; no deploy without permission (§01) | Yes | CLAUDE.md rules; deploy gate |
| Mobile-first, every viewport, real iPhone Safari (§05) | Yes | viewport projects + manual iPhone checklist |
| Touch targets ≥ 44 px, visible focus, reduced motion, no sideways scroll (§05) | Yes | accessibility + navigation suites |
| Scripted smoke + browser journeys + axe as a supplement (§06) | Yes | Playwright suites below |
| Test the deployed URL, record the version (§06) | Yes | post-deploy smoke job in GitHub Actions |
| Change procedure: diagnose, minimal change, target + regression (§10) | Yes | every fix gets a test |
| AI layer: evaluation cases, cost ceiling, fallback (Stage 7) | When Claude is connected | multilingual suite becomes part of the eval set |
| SaaS foundations, accounts, admin, billing, scale (Stages 5, 8, 9, 13, 14) | No | not needed for a static site |

## 2. Automated tests (Playwright)

Run locally: `npm test` (all) · `npm run test:smoke` · `npm run test:live` (smoke tests against the live site) ·
`npm run report` (opens the HTML report with screenshots and traces of failures).

| Project | Engine | Viewport | Stands in for |
|---|---|---|---|
| desktop-chromium | Chromium | 1440×900 | Desktop Chrome/Edge |
| mobile-chromium | Chromium | Pixel 7 (412×915) | Android Chrome |
| mobile-webkit | WebKit (Safari's engine) | iPhone 13 (390×844) | Closest automation gets to iPhone Safari |

Phone tests also resize to 320, 375, 390 and 430 px; the no-sideways-scroll sweep covers
320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px.

| Suite | Covers |
|---|---|
| smoke | page loads, entrance finishes, robot shown, no console errors, logo has no container |
| navigation | every tab opens/closes (×, Escape, click outside), phone nav inside the screen, no sideways scroll |
| services | packages and prices match `services.json`, one open at a time, reset after leaving, opened package scrolls to the top, keyboard |
| terminal | fits phone screens, long EN/RU/UK text wraps, input ≥ 16 px (no iOS zoom), conversation scroll doesn't move the page, commands, chips |
| multilingual | services, prices, contact, projects and unknown questions in EN/RU/UK answered in the same language with the same facts |
| accessibility | axe WCAG 2 A/AA on home, Services and terminal; accessible names; keyboard; 44 px touch targets |

Tests tagged `@smoke` also run against the deployed URL after every release.

**Known issues (non-blocking).** Tests named "known issue Dn" are accepted defects that Olga chose not to
block deploys on (currently D5 colour contrast, D6 touch targets). They run every time and appear in the
report as expected failures; if one starts passing, Playwright flags it, and the marker should be removed.
Every other failure blocks deployment.

**Limits of automation.** Emulated phones do not reproduce iOS Safari behaviour such as auto-zoom on focus,
the on-screen keyboard resizing the page, the collapsing address bar, safe areas or real touch scrolling.
WebKit narrows the gap but is not iOS. A green run means "no regressions found in simulation", not
"works on iPhone".

## 3. Manual real-device checklist (iPhone Safari)

Do this after any change to layout, navigation, the terminal, Services or animations. Clear the tab first
(close and reopen it) so no earlier zoom state carries over.

1. Open asboagent.com — the entrance plays smoothly; no pixel streaks remain.
2. Logo, "olga." and the top nav are fully visible; nav doesn't touch the right edge; nav scrolls sideways.
3. Tap the chat icon — the terminal opens **without zooming in**; nothing is cut off on the right.
4. Type a long message in English, then Russian, then Ukrainian — text wraps; the keyboard doesn't hide the input.
5. Close the keyboard and the terminal — the page is not left zoomed or shifted.
6. Open Services — tap a package: it opens and moves to the top of the panel; tap another: the first closes.
7. Close Services, reopen — everything is collapsed.
8. Rotate to landscape and back — nothing overflows.

Record each run:

| Date | Device | iOS | Browser | Build (commit) | Steps passed | Defects |
|---|---|---|---|---|---|---|
| 2026-10-31 | iPhone (model not recorded) | not recorded | Safari | 1313423 (local preview) | nav, Services package switch, terminal (no zoom, wrapping, RU/UK) | none (reported "looks good" by Olga) |

## 4. Release checklist (adapted from §11)

- [ ] Olga approved the design and wording; no unapproved claims or DRAFT text visible.
- [ ] `npm test` passed locally; failures, if any, were reported and fixed or explicitly accepted.
- [ ] Mobile-affecting change: iPhone checklist run and recorded above.
- [ ] No secrets or personal data in the repo; prices only in `services.json`.
- [ ] Deployed through GitHub Actions; the live smoke job passed; commit recorded.

## 5. Defect log

| ID | Found | Area | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| D1 | 2026-10-31 | Terminal (iPhone) | open terminal | fits at 100% zoom | page zooms in; text cut off | fixed; verified on iPhone 2026-10-31 |
| D2 | 2026-10-31 | ASBO languages | ask in Russian | answer in Russian | English "don't know" | fixed (asbo-intents.js, EN/RU/UK); RU/UK wording pending Olga's review |
| D3 | 2026-10-31 | Phone nav (iPhone) | load site | nav clear of right edge | nav near the edge | fixed ("olga." hidden on phones, edge fade); verified on iPhone 2026-10-31 |
| D4 | 2026-10-31 | Services (phone) | open a package | moves to top of panel | stays in place; later jumped when switching | fixed; verified on iPhone 2026-10-31 |
| D5 | 2026-10-31 | Accessibility | axe scan | WCAG AA contrast | pale labels below AA contrast | accepted, non-blocking (Olga, 2026-10-31) |
| D6 | 2026-10-31 | Accessibility (phone) | measure nav | tap targets ≥ 44 px | icons 34 px, tabs 30 px tall | accepted, non-blocking (Olga, 2026-10-31) |
| D7 | 2026-10-31 | ASBO prices | ask about prices | match services.json | quoted old AI-bot prices | fixed (prices read from services.json) |
