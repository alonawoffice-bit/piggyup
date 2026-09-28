# PiggyUp — Upgrade Notes: `validation-v2` (branch `upgrade/validation-v2`)

Date: 2026-09-28 · Base: main `1f393dc8` · Checkpoint tag: `pre-upgrade-2026-09-28`
Status: **validation-stage upgrade, NOT merged to main, NOT deployed.**

## What changed

**Core (safe foundation)**
- Silent auto-migration `piggyup_data_version` 1→2: money floats → **agorot integers** (no more floating-point errors). Existing user data preserved (verified by tests).
- Service seams for a future backend (no backend now): `Store`, `Sub` (subscription), `Analytics` (privacy-safe event allowlist), `AIService` (local curated bank), `EmailService` (bug reports).
- Every money move is a **ledger transaction** (`S.ledger`); balances are a recomputable cache. Corrections use reversal txs — never silent edits.
- Idempotency: double-click can never award twice (`onceOp`).
- Font Heebo → **Rubik** (Hebrew + Cyrillic support).

**Money**
- Upgraded parent dashboard: greeting, totals, 3 configurable boxes, main-goal progress, today's mission, pending approvals, recent activity, quick actions, smart empty states.
- Add money: quick amounts 10/20/50/100₪, custom amount, 6 sources, **Smart Split vs manual**, live **preview** before confirm, atomic ledger entries.
- Split rules: percentages must sum **exactly 100%**; applies to new money only.
- Boxes: rename / icon / color / **archive** (never delete history).
- Ledger history UI with correction/reversal flow.
- Educational investment **matching rule** (per-10₪ or monthly %) + always-visible disclaimer (educational tracking only, not investment advice).

**Goals & tasks**
- Goals: 25/50/75/100% **milestones**, main-goal star, deposit blocked above save balance, confetti + badge at 100%.
- Tasks: money rewards, due dates, recurring (daily/weekly auto-respawn), parent **approve / reject-with-reason** flow; kid sees reasons.
- **30-day financial journey** as structured data (HE+RU): money → earning → saving → spending → investing-as-concept → thinking. Positive-only, 3–5 minutes, no personal questions.
- Daily AI mission: **parent previews & approves before the child sees it**. No open chat.
- Achievements awarded once; streaks never punish.

**Subscription, support, legal, data**
- Trial card (explicit start → 7 days → expired/requested/premium), pricing 19₪/29₪ display with honest "server-side counting later" note. **WhatsApp manual flow preserved exactly** (same number/message format — now keeps the typed name/phone). Admin-code activation preserved.
- Bug report → opens the user's mail app with a prefilled report to piggyup2@gmail.com + local outbox log. Never claims "sent" when it wasn't.
- Help center (8 FAQs), 7 legal templates (privacy, terms, child safety, AI policy, copyright, deletion, contact) — marked as templates, **no compliance claims**.
- Export my data (JSON download), Delete account (two-step typed confirmation). Replaces the raw reset button.
- Print home kit (goal sheet, weekly tracker, boxes, certificate, tasks table).
- Family league: avatar + name + points + streak only — **never money**. Parent can disable.

**PWA**
- `manifest.webmanifest`, `sw.js` (network-first, safe updates), icons 192/512 + apple-touch-icon. Installable.

**i18n**: 240 new strings, full Hebrew/Russian parity, central dictionary. RTL/LTR verified.

## What still does NOT exist (honest)
No backend, no Supabase, no Stripe/real billing, no server-side subscriber counting, no real email sending (mailto-based), no push notifications. Admin daily code remains computable client-side (known validation-stage tradeoff).

## Tests
12/12 jsdom tests pass (`qa/run.js`): clean boot, v1→v2 migration, idempotent migration, he/ru render + RTL/LTR, i18n parity (373 keys), add-money idempotency, task-approve idempotency, goal deposit cap, split 100% validation, no storage sprawl, money display, PWA static check.

## Next recommended step
Alona reviews this branch (preview deploy or local), approves scope, then — and only with her explicit "פרסמי" — merge to main for production deploy.

## Session 2026-09-28 (evening) — hardening & completion

**Fixed**
- Deposit idempotency end-to-end: every deposit carries an `operationId` (`deposit-<uid>`); re-sending the same op is a no-op (`onceOp`), a *new* op with the same amount/day is applied. Double-click disables the submit button instantly. Verified: A) 100 → 10000ag; B) 100+100 → 20000; C) 100+100+50+100 → 35000; D) same opId replay → no change; E) new opId same amount/day → saved; F) 123.45 → 12345ag exactly; G) v1 123.45 migrated twice → stays 12345.
- Split modal: Save button is `disabled` until the three percentages sum to exactly 100% (live re-validation on every input).
- Deposit modal: submit disabled while amount > save balance; warning shows Available vs Requested.
- Language switch with an open modal: the header toggle now closes any open modal and toasts a notice (prevents modal content frozen in the old language).
- Main goal: `A.setMainGoal(childId, goalId)` works from both home and manage screens; star button + "יעד ראשי" badge render correctly.
- Rubik self-hosted: 20 woff2 files (latin, latin-ext, hebrew, cyrillic, cyrillic-ext; 400/600/700/800) in `fonts/`; `@font-face` inlined in the CSS; all Google Fonts links removed; fallback `Rubik, system-ui, "Segoe UI", Arial, sans-serif`. Works offline.
- Onboarding (new users only, existing data is detected and skipped): 10-step wizard Welcome → Language → Parent → Child+age → Avatar → Split → Optional Goal → Explanation → Trial → Done/Add Money. No full name / birth date / address / phone of the child is collected. Commit is failure-safe: state is applied to memory only after `save()` succeeds; on storage failure everything rolls back and the user is told to retry. "דלגי" only skips the optional goal; entering a goal and continuing saves it and marks it as the main goal.
- Legal: 8 pages exactly — Terms, Privacy, Child Safety, Cookies & Analytics, Payments & Cancellations, Content, Accessibility, Contact (footer: © 2026 PiggyUp). Every page carries the shared disclaimer (educational content only, not professional advice) and is labeled a template, not legal advice. Privacy page now describes the anonymous visit beacon factually (event type + timestamp → Google Apps Script; no names/emails/identifiers), without "no tracking" claims.
- `docs/ASSETS_LICENSES.md`: Rubik (SIL OFL-1.1) attribution; emoji = OS-rendered, no bundled image assets.
- `rollback-guard/`: snippet + guarded v1 build + README. Deploy order if ever published: guarded v1 first, then v2.

**Tests** — 22/22 jsdom tests pass (`qa/run.js`): all 12 previous + 10 new (deposit idempotency A–G, fractional-migration stability, split blocked-state, main-goal select, onboarding shown-for-new-only, onboarding end-to-end commit, 8 legal pages + disclaimer on all, language switch with modal open, self-hosted fonts + zero Google Fonts references, old-build rollback guard shows the update screen on v2 data).

**Data Safety**
- Migration: v1→v2 converts floats to agorot integers; verified totals (box balances, goal saved/target, transaction counts) in tests 2–3 and 14. No partial-state path: migration either completes or leaves v1 untouched.
- Rollback: old build refuses to render or overwrite v2 data (guarded build shows "נדרש עדכון"); old-tab saves blocked when another tab upgraded the schema.
- Money idempotency: operationId on add-money and deposits; double-submit/double-click cannot create duplicates.

**Backward Compatibility**
- v2 reads v1 data and migrates it once, idempotently. v1 builds must never see v2 data — the rollback guard enforces this (old build + v2 data = update screen, no render, no save).

**Remaining (not in this branch)**
- Real-user browser QA on the built HTML (clicks, persistence across reload, he/ru visual check, offline fonts in a real browser).
- Footer copyright link target is the Terms page (no separate legal index page).
- `piggyup2@gmail.com` is the contact address carried over from the current build — Alona has not re-confirmed it in this session.
- Offline behavior beyond fonts (service worker caching) was not re-tested in this session.

**Production Risk**: MEDIUM-LOW. Data-safety paths (migration, idempotency, rollback guard) are covered by automated tests, but no real-browser validation has been done yet. **Do NOT merge to main or deploy without Alona's explicit "פרסמי".**
