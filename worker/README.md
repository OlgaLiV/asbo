# ASBO chat Worker

Connects the ASBO terminal on asboagent.com to a Claude model. Status: **built and tested locally with a fake model
only.** No account, key, deployment or paid call exists yet.

## How a question is answered

1. The terminal (`asbo.js`) sends the question, plus up to 10 earlier turns as plain text, to this Worker. It does so
   only when `<meta name="asbo-ai-endpoint">` in `index.html` holds a URL. Empty, as today, means scripted answers only.
2. The Worker refuses other origins, oversized or malformed requests, and questions over 500 characters.
3. It reserves one slot in the shared limiter (a Durable Object): 100 AI replies a day for the whole site, and per
   visitor 30 a day and 10 a minute. The UTC day resets at 00:00 UTC (7–8 pm in Tampa).
4. It loads prices from the live `services.json` (cached for 10 minutes). If that file can't be read, or its prices
   look wrong, it uses the copy bundled at deploy. It never guesses.
5. It calls Claude Haiku 5.5 (`claude-haiku-5-5`, set in `wrangler.toml`) with:
   - `src/knowledge.md`, approved public facts only
   - the live price table
   - a structured reply format (reply text, button, language, prices mentioned)
6. `src/validate.js` checks the reply. If anything fails, the visitor gets the approved scripted answer instead, with
   a short note. Price problems get the approved price answer.
7. Any failure (timeout, API error, limit reached, no key, prices unavailable) also falls back to the scripted answer.

## What the reply checker verifies, and what it can miss

It is a safety net of pattern rules, not a proof that a reply is correct.

**It checks:**
- **Dollar amounts:** every amount (`$850`, `850$`, `850 usd`, `850 долларов`) must be a published price.
- **Price and service match:** each amount must sit next to words for the service it belongs to (one-page, business,
  advanced, essential, business care), in EN, RU and UK. A published price next to web apps, mobile apps, AI
  assistants or automation is rejected.
- **Starting prices:** website prices must be stated as starting prices and never as fixed or total.
- **Monthly plans:** care-plan prices must say "a month", and website prices must not.
- **Other forms of a price:** prices written in words, other currencies, and percentages are rejected.
- **Offers:** discounts, "free" (except the free consultation and free images) and guarantees are rejected unless the
  sentence negates them.
- **Promises:** timelines (any "N days/weeks" other than the 30-day defect period) are rejected, as are "included"
  claims for things that are quoted, added on request, or paid by the client.
- **Unpublished items:** any word or figure in the `INTERNAL_TERMS` secret (a private, comma-separated list set at
  deploy, never in this public code) is rejected.
- **Consistency:** the prices the model says it used must match both the table and the text.
- **Language:** the reply must be in the visitor's language.

**It can miss:**
- **Wrong facts with no number and no listed keyword,** for example a wrong policy ("olga updates sites built by
  others"), an invented feature, or a wrong project status.
- **Misattribution without service words,** for example "the big option is $850".
- **Misleading negation:** the "no/not" heuristic can accept a misleading sentence that happens to contain a negation.
- **Tone or helpfulness problems.**

**When it is unsure:** there is no "maybe" state. Any rule that fires means a fallback. That errs towards caution:
some correct replies will be replaced by the scripted answer. A reply that fires no rule is shown as written. So
accuracy beyond these rules depends on the instructions, the model and testing. Before going live, run the test set
of realistic questions against the real model (a small, approved paid run) and read the replies.

## Daily cap and spending: how it is enforced and its limits

**How the cap works:**
- **One counter:** a single Durable Object counts for the whole site. The check and the increment run in one
  synchronous SQLite transaction, so simultaneous requests can't overshoot. Tested: 150 simultaneous requests gave
  exactly 100 replies.
- **Slots are counted before the call:** a failed call still uses its slot, so errors can't be used to get extra
  calls. SDK retries are off, so one slot means at most one paid call.
- **Bounded size per call:** 500-character question, at most 10 turns of up to 1,500 characters each, and at most 1,024
  output tokens.
- **Worst case on Haiku 5.5 at today's prices:** about 100 × (12,000 input tokens × $0.10/M + 1,024 output tokens ×
  $0.50/M) ≈ **$0.17 a day**. This is an estimate, to confirm with real usage.

**What it does not protect against:**
- **Origin checks** stop other websites' browsers, but a script can fake the Origin header.
- **Per-visitor limits** use a hashed IP address, so someone with many IPs gets more than 30 a day. The site cap still
  holds.
- **Exhausting the cap:** an attacker can use up the 100 daily replies, and real visitors then get scripted answers
  until 00:00 UTC. Spend stays capped. Cloudflare Turnstile (a free bot check) would reduce this, but it needs a
  Cloudflare site key and front-end work.
- **Separate deployments:** each deployed Worker (for example a preview environment with its own key) has its own
  counter. Deploy only one with the real key.
- **Test mode:** test-only routes and headers (`/__test/*`, `x-test-*`) work only when both `DEV_MODE=1` and
  `FAKE_MODEL=1` are set, so they can't coexist with real calls. Production must set neither.
- **Timeouts:** when the Worker gives up after about 14 seconds, the model may already have produced tokens that are
  billed.
- **Provider-side controls** are the outer limit (see Setup). Anthropic's docs say API requests stop when prepaid
  credits run out, and a monthly spend limit can be set per workspace. How exactly the provider enforces those at the
  boundary isn't verified here; check the Console's billing and limits pages when setting up.

## Running it locally (fake model, no account needed)

```bash
npm test            # all suites; Playwright starts the site and two local Workers with FAKE_MODEL=1
```

## Setup steps (for Olga, when ready; nothing here has been done)

1. **Anthropic Console:** create an organization at console.anthropic.com. Payment details are entered by you.
2. **A separate workspace** (for example "asbo-site"), so this key has its own spend limit.
3. **Billing:** buy a small prepaid credit (you choose the amount), leave auto-reload **off**, and set the workspace's
   monthly spend limit. Check in the Console what happens at zero balance and at the limit, and whether usage
   alerts can be set.
4. **API key:** create one in that workspace, named for example "asbo-worker". Never paste it into chat, code,
   commits or the browser.
5. **Cloudflare:** create a free account, then in your own terminal: `cd worker && npx wrangler login`.
6. **Secrets:** run `npx wrangler secret put ANTHROPIC_API_KEY` and paste the key at its prompt. Then run
   `npx wrangler secret put VISITOR_SALT` with any long random text, and `npx wrangler secret put INTERNAL_TERMS` with
   the private list of unpublished names and figures (the same list as `asbo-previews/internal-terms.txt`).
7. **Deploy:** `npx wrangler deploy` (with Olga's approval). This gives a `https://asbo-chat.<account>.workers.dev`
   address; no DNS change is needed.
8. **Check** that `wrangler.toml` has no `DEV_MODE` or `FAKE_MODEL`, that `ALLOWED_ORIGINS` is `https://asboagent.com`,
   and that `PRICES_URL` is `https://asboagent.com/services.json`.
9. **Real-model test run** (small and paid, needs Olga's approval): run the test questions against the deployed
   Worker, then read the replies and the rejection rate.
10. **Turn ASBO on:** put `https://asbo-chat.<account>.workers.dev/chat` in the `asbo-ai-endpoint` meta tag, publish
    through the normal tested deploy, and run the iPhone check.
11. **Privacy notice:** finalise it (`asbo-previews/privacy-notice-DRAFT.md`) before step 10.
