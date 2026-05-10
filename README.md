# Studie Mentor

A private, single-user tutoring app for HAVO 1. Three subjects: **Wiskunde**, **Frans**, **Nederlands**. Built with Next.js + Claude API.

## What it does

- Subject picker on entry
- Each subject has its own tuned system prompt:
  - **Wiskunde** — Socratic, refuses to give answers, identifies misconceptions
  - **Frans** — drill-mode, gives answers fast, spaced-repetition within a session, vocab-list aware
  - **Nederlands** — switches mode by topic (regel-gestuurd voor spelling/grammatica, Socratisch voor begrijpend lezen)
- At end of each session: writes a 3-5 sentence note. Notes stored per-subject in browser localStorage.
- Speaks Dutch only, refuses homework cheating, refuses off-topic chat.

## Stack

- Next.js 14 (App Router) + Tailwind
- Claude Sonnet 4.6 via Anthropic API (streamed)
- Per-subject session notes in browser localStorage (no database)
- Single passcode gate

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in ANTHROPIC_API_KEY and APP_PASSCODE in .env.local
npm run dev
```

Open <http://localhost:3000>.

## Deploy to Vercel

If you already have a `wiskunde-mentor` repo deployed, the simplest move is to **replace its contents with this code and push** — Vercel will auto-redeploy and the URL stays the same. localStorage notes from the old wiskunde version will be lost (different key); not a real loss in week 1.

Otherwise:

1. Push this repo to GitHub.
2. <https://vercel.com/new>, import the repo. Defaults are correct (Next.js).
3. Add environment variables before clicking Deploy:
   - `ANTHROPIC_API_KEY` — from <https://console.anthropic.com/>
   - `APP_PASSCODE` — anything; what your son types in once
   - `STUDENT_NAME` (optional) — his first name
   - `STUDENT_BOOK_WISKUNDE` (optional) — `Getal & Ruimte` or `Moderne Wiskunde`
4. Deploy. URL like `https://studie-mentor-xyz.vercel.app`.
5. Send him the URL + passcode.

## Cost expectations

At ~30 minutes/day across all subjects with Sonnet 4.6: roughly €5-15/month in API spend ($3/M input, $15/M output). Vercel hosting is free.

If costs surprise you, switch the model in `app/api/chat/route.ts` and `app/api/summary/route.ts` to `claude-haiku-4-5-20251001` (cheaper, less capable at pedagogy — try Sonnet first).

## Tuning the tutors

Each subject has its own file in **`lib/system-prompts/`**:

- `wiskunde.ts` — math behavior
- `frans.ts` — French behavior
- `nederlands.ts` — Dutch behavior

After watching him use it, edit the relevant file. Push to GitHub; Vercel auto-redeploys.

Common things to tune:

- **Too long-winded** → strengthen "KORT" rules with examples
- **Giving away math answers** → reinforce "GEEF NOOIT DIRECT HET ANTWOORD"
- **Frans tutor too patient** → tell it to drill faster, less explanation per beat
- **Wrong tone** → rewrite the personality block
- **Off-curriculum** → add or remove from the WAT JE KENT block

## Critical for Frans (test prep)

The French tutor is only as good as the source it works from. Before his test:

1. Open the app, pick Frans.
2. **First message: paste his vocabulary list** (from the textbook or the teacher's printout). Format doesn't matter — the bot will figure it out.
3. Tell it the grammar topic and test date.

Without the vocab list, the bot guesses HAVO 1 standard vocab and is ~60% aligned with what's actually on the test. With the list, it's 100% aligned.

If the list is in a printed boekje, pictures work too — Claude reads images. But the app doesn't have an upload button yet (v2). For now: type or paste the list, or hold the phone to a scanner app first.

## Adding a fourth subject (e.g. biology)

1. Create `lib/system-prompts/biologie.ts` (copy `wiskunde.ts` as a template, adapt)
2. Wire it into `lib/system-prompts/index.ts` (add to switch + Subject type + labels)
3. Add to the picker in `app/page.tsx` (one new entry in the `(["wiskunde", "frans", "nederlands"]` array)
4. Add a description and opening hint in `SUBJECT_DESCRIPTIONS` and `SUBJECT_OPENING_HINT`

About 50 lines total. Don't add a subject until the existing three are working — better to fix bugs in three than ship four mediocre tutors.

## Privacy

- Session notes stay in the student's browser, not on any server.
- Conversations go to Anthropic's API. Default 30-day retention. Acceptable for homework, not for sensitive content.
- Passcode is shared, single value. Don't post the URL publicly.
