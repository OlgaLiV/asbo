# ASBO portfolio: rules for AI agents

Static site (HTML/CSS/JS, no build) published on GitHub Pages at https://olgaliv.github.io/asbo/.
Owner: Olga (AI Studio by Olga). Detailed QA process: **QA_PLAYBOOK.md**. Design tokens: **DESIGN.md**.
Source methodology: `../Universal_AI_Project_Playbook.md` (kept outside this public repo).

## Owner decides, agent proposes
- Olga approves scope, copy, prices, design and every push/deploy. Propose first; stop at approval gates.
- Never silently expand scope or bundle unrelated changes into a fix. Diagnose → explain → minimal change → verify.
- Never invent clients, results, testimonials, prices, credentials or project statuses.
  Prices and service text live only in `services.json`; ASBO's answers must match it.

## Protected (approved) — do not change without explicit approval
The robot design and motion, the pixel-assembly entrance and its timing, the ASBO typography and colours,
the Services Direction A layout, and existing navigation behaviour.

## Every change is verified on desktop AND mobile
1. Run `npm test` (Playwright: desktop Chromium, phone Chromium, phone WebKit). Add or update a test for
   any new feature or bug fix, alongside the code it protects.
2. Report results as numbers and names (passed / failed / skipped, which tests failed and why). Never claim a
   check ran when it did not, and never summarise failures away.
3. Simulated phones are not real devices. For anything that affects mobile layout, input, scrolling or
   the terminal, ask Olga to run the iPhone Safari checklist in QA_PLAYBOOK.md and record the result.

## Deploying
- Production deploys only through the GitHub Actions workflow, which runs the tests first and publishes
  only if they pass, then smoke-tests the live URL. Do not push to `main` without Olga's approval.
- No secrets in the repo or the browser. The future Claude API key lives only in the Cloudflare Worker.
