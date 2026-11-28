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
| mobile-layout | phone nav slides away instead of covering the robot (several widths, landscape, every scroll step) and returns on scroll up or focus; panel close buttons stay in their corner at any scroll position (long Services content); terminal stays inside the visible screen with a simulated keyboard, keeps the latest answer above the input, restores when the keyboard closes; suggested questions don't pop up the phone keyboard |
| chat-voice | every ASBO line in EN/RU/UK starts with a capital and spells ASBO and Olga with capitals, no "prepared notes"; no CSS lowercasing; visitor text shown as typed; every part of a multi-part message answered (EN/RU/UK); weather/time answered honestly with an offer; repeated questions get a light, different reply; /clear starts fresh |
| `privacy-notice` | AI privacy notice: absent while AI is off; with AI on (fake model) the terminal line, panel, three languages, close behaviour and accessibility, 320 to 1280px |
| multilingual | services, prices, contact, projects and unknown questions in EN/RU/UK answered in the same language with the same facts |
| accessibility | axe WCAG 2 A/AA on home, Services and terminal; accessible names; keyboard; 44 px touch targets |
| ai-logic | ASBO reply checker (prices, wording, languages), price loading and fallback, what the model is told, scripted fallbacks pass the checker |
| ai-worker | local Worker with the fake model: shared daily cap under concurrency, visitor limits, origins, sizes, rejected replies, timeouts, logs without visitor text |
| ai-terminal | terminal with AI on (desktop + phones): EN/RU/UK answers, buttons, history, fallbacks, limits, commands stay local, AI off by default |

AI tests never call a real model: Playwright starts two local Workers with `FAKE_MODEL=1` (see `worker/README.md`).

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

1. Open https://asboagent.com/ — the entrance plays smoothly; no pixel streaks remain.
2. Logo, "olga." and the top nav are fully visible; nav doesn't touch the right edge; nav scrolls sideways.
3. Scroll down slowly past the robot — the nav slides up out of the way and never sits on the robot's head.
   Scroll up a little — the nav comes back and its tabs work. Back at the top, the nav is in place.
4. Tap a suggested question — the terminal opens with the answer and **no keyboard**; the header, × and the answer's
   button are visible.
5. Tap the terminal input — the keyboard opens; the terminal's top edge and × stay visible, the latest answer and
   its button are above the input, not under it. Tap ×: the terminal closes.
6. Tap the chat icon — the terminal opens **without zooming in**; nothing is cut off on the right.
7. Type a long message in English, then Russian, then Ukrainian — text wraps; the keyboard doesn't hide the input.
8. Close the keyboard (tap ✓ or swipe it down) — the terminal returns to its normal size and position; the page is
   not left zoomed or shifted.
9. Open Services — tap a package: it opens and moves to the top of the panel; tap another: the first closes.
10. In Services, Work and About, scroll to the bottom — the × stays in the top corner; tap it: the panel closes.
11. Close Services, reopen — everything is collapsed.
12. Rotate to landscape and back — nothing overflows; repeat step 3 in landscape.

Record each run:

| Date | Device | iOS | Browser | Build (commit) | Steps passed | Defects |
|---|---|---|---|---|---|---|
| 2026-10-31 | iPhone (model not recorded) | not recorded | Safari | 1313423 (local preview) | nav, Services package switch, terminal (no zoom, wrapping, RU/UK) | none (reported "looks good" by Olga) |
| 2026-11-23 | iPhone (model not recorded) | not recorded | Safari | 3e14822 + uncommitted mobile fixes (local preview) | nav slides away on scroll and returns (portrait, landscape), suggested question without keyboard, terminal with keyboard open and closed, × closes it, panel × stays reachable in Services, Work, About | none (all checks passed, reported by Olga) |
| 2026-11-24 | iPhone (model not recorded) | not recorded | Safari | 98432b9 (live site, asboagent.com) | nav does not cover the robot while scrolling, terminal usable as the keyboard opens and closes, × reachable after scrolling Services and Work | none (all three work, reported by Olga) |
| 2026-11-24 | iPhone (model not recorded) | not recorded | Safari | 98432b9 + uncommitted privacy notice (local preview, AI off) | the Privacy line and notice work on the iPhone (individual steps not listed) | none ("Yes, it works", reported by Olga) |

## 4. Release checklist (adapted from §11)

- [ ] Olga approved the design and wording; no unapproved claims or DRAFT text visible.
- [ ] `npm test` passed locally; failures, if any, were reported and fixed or explicitly accepted.
- [ ] Mobile-affecting change: iPhone checklist run and recorded above.
- [ ] No secrets or personal data in the repo; prices only in `services.json`.
- [ ] Turning AI on: after the final Worker deploy, recheck that the privacy notice still matches: Worker Logs, Traces
      and Issues off, no exports; Anthropic Console data controls at 30 days, user feedback off, Development Partner
      Program not joined. Olga approved the EN, RU and UK texts, and the Privacy link and panel work on her iPhone.
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
| D7 | 2026-11-28 | Terminal (iPhone) | scroll down the page, open the terminal, close it | page returns to the same scroll position | page returns to a different scroll position (reported by Olga on her iPhone; not reproduced in WebKit/Chromium phone emulation, where the position is kept and the terminal opens, answers and closes normally; likely tied to the real on-screen keyboard) | cause: Safari pans the page to keep the focused input above the keyboard, and closing only returned focus. Fixed locally 2026-11-28 (asbo.js restores the page position when the last panel closes; regression tests in terminal.spec.js simulate the pan on phone projects); awaiting Olga's iPhone check, not deployed |
| D8 | 2026-11-28 | Phone nav (iPhone) | scroll down fast, or to the bottom | nav stays hidden below the top area and never covers the robot | after fast swipes and near the bottom (Safari bounce) the nav came back over the robot | cause: the nav followed scroll direction, so any small upward movement showed it. Fixed locally 2026-11-28: it follows the page position (hidden past 48 px, back above 24 px); tests for slow and fast scrolling, bottom bounce, returning up and edge flicker in mobile-layout.spec.js. Awaiting Olga's iPhone check, not deployed |
| D8 | 2026-11-23 | Phone nav (iPhone) | scroll down | nav clear of the robot | nav covers the robot's head | fixed (nav slides away on scroll down, returns on scroll up); verified on iPhone 2026-11-23 (local preview) and 2026-11-24 (live site) |
| D9 | 2026-11-23 | Terminal (iPhone) | tap a suggested question or the input | terminal usable with the keyboard | terminal jumps up; header and × hidden; answer button under the input | fixed (terminal pinned to the visible screen; no keyboard for suggested questions); verified on iPhone 2026-11-23 (local preview) and 2026-11-24 (live site) |
| D10 | 2026-11-23 | Panels (iPhone) | scroll Services or Work | × reachable | × scrolls away | fixed (× sticks to the corner, all panels); verified on iPhone 2026-11-23 (local preview) and 2026-11-24 (live site) |
| D11 | 2026-11-23 | ASBO chat (iPhone) | "Hi, how are you? Who are you?", "What is the weather today?", repeat a question | greeting, answer and intro; honest weather reply; light reply to repeats; normal capitals | all lowercase; one part answered; "prepared notes" wording; identical repeats | fixed locally (asbo-intents.js voice and talk lines, asbo.js answers every part and remembers the chat); published 2026-11-24 in 98432b9, live chat verified on desktop and simulated phone |
| D7 | 2026-10-31 | ASBO prices | ask about prices | match services.json | quoted old AI-bot prices | fixed (prices read from services.json) |
