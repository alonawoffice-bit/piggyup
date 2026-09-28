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
