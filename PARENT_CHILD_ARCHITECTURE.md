# Parent Mode + Child Mode — Architecture

Branch: `upgrade/parent-child-modes` (from v2 `8ee9339`). **Never merged to `main`, never deployed to production.**

## 1. What this is

PiggyUp v2 had one free mode toggle (parent/kids) with no protection: anyone holding
the phone could switch to parent mode. This upgrade adds:

- **Device roles** — each browser/device is a *parent device* (full access) or a
  *child device* (bound to one child, locked in kids view).
- **Parent control code** — 4–8 digits, SHA-256 hashed with salt, 5-attempt lockout.
  Unlocks parent mode on a child device for the current tab session only.
- **Child self-entry** — a child at/above their *independence age* can log money they
  received (amount + source: allowance/gift/chores/sale/found/other). Split follows the
  family smart-split rule; every tx is attributed `by: "child"`.
- **Device pairing** — parent issues a one-time 6-character connection code (24h) per
  child; the child's device imports the family snapshot and redeems the code.
- **Manual cross-device sync** — export/import of a family snapshot (merge by id,
  idempotent). No automatic sync: there is no backend in this build.
- **Parent audit** — history view (who / what / when / amount / source) + parent-only
  transaction deletion (balances rebuilt from the ledger, goal deposits rolled back).

## 2. Data model (additive on schema v2, `S.v` stays `2`)

| Field | Shape | Notes |
|---|---|---|
| `S.family` | `{id, createdAt}` | one family per data set; created on migration |
| `S.device` | `{role:"parent"\|"child", childId}` | **this** device; existing users default to `parent` (no lockout of current users) |
| `S.devices` | `[{id, childId, code, issuedAt, expiresAt, redeemed, revoked}]` | pairing registry |
| `S.parentAuth` | `null \| {salt, hash, setAt, fail, lockUntil}` | SHA-256(salt\|code); hash only, never the code |
| `S.perms` | `{childCanCreateGoals: true}` | family-level permission flags |
| `child.age` / `child.independenceAge` | number \| null | `independenceAge: null` = self-entry off |
| `S.rolesV` | `1` | roles migration marker (idempotent) |

Migration is additive, idempotent, and verified (children/ledger counts unchanged);
a `piggyup_backup_roles_*` snapshot is taken first when real user data exists.

## 3. Mode enforcement

`Roles.effectiveMode()` is the single source of truth for what the user sees:

- child device + no session unlock → `"kids"` (forced), regardless of stored `S.mode`
- otherwise → `S.mode`

Enforcement points: `renderApp` (screen routing), `renderHeader` (lock button replaces
the mode toggle on a locked child device), `renderNav` (kids tabs only), plus guards on
`A.*` actions: `setMode`, `go`, `selectChild`, all money/task/goal/settings actions.
A child device also forces `S.activeChildId` to the bound child on every render.

`window.__rolesUnlocked` is memory-only: closing the tab re-locks the device.

## 4. Permissions

- **Child-allowed:** view own data, self-enter money (if eligible), create goals (if
  eligible and `perms.childCanCreateGoals`), deposit to own goal, complete own tasks.
- **Parent-only:** manage children, allowance, independence age, permissions, delete
  history/transactions, family settings, parent code, device pairing, export/import,
  subscription activation, full reset.

The lists live in code as `Roles.CHILD_ALLOWED_ACTIONS` / `Roles.PARENT_ONLY_ACTIONS`.

## 5. Honest security note

The parent code is **client-side obfuscation, not real security**: the hash and all data
live in the browser's localStorage. It stops a curious child; anyone who can open
browser devtools can bypass it. This is stated in the app's manage tab
(`upg.r.security_note`) and here. Real enforcement requires a backend with accounts.

## 6. Sync model (no fake sync)

- **Same browser:** parent and child share one `S` — changes are instant.
- **Across devices:** manual export → import. Merge is by record id: new records are
  added, child profile fields updated, `events` unioned, balances rebuilt from the
  merged ledger. Re-importing the same snapshot adds 0 records (idempotent).
  A snapshot from a *different* family is refused. Subscription state is never
  imported (device/account level).
- **What a backend would need for auto-sync:** family accounts, a server-side ledger
  as source of truth, real auth (the parent code becomes a real credential), conflict
  resolution, push. None of that exists in this static build — the UI never claims
  otherwise.

The connection code (pairing, 6 chars, 24h) and the parent control code (4–8 digits)
are **two different secrets**; the code enforces and tests this.

## 7. Test results (2026-09-30, jsdom)

- Roles suite `qa/roles.js`: **16/16 PASS** — migration, code set/verify/lockout,
  locked child device, unlock/relock, independence age, child self-entry (split math,
  `by:"child"`, audit), parent add → child sees, child isolation (A can't see B),
  parent-only actions blocked, independence edit, pairing issue/redeem (incl. reuse and
  bad codes), cross-device export/import (merge + idempotent, no dupes), parent tx
  delete (+idempotent, blocked for child), history/audit UI, code separation.
- Regression `qa/run.js`: **22/22 PASS** — no existing feature broken.
- Russian UI: roles screens render fully translated, no leaked i18n keys.
- SHA-256 implementation verified against standard test vectors.

## 8. Files

- `index.html` — assembled app (this branch)
- Chunk sources (build inputs, not in this repo): `~/workspace/piggyup-upgrade/chunks/50-roles.{js,css,i18n.json}`, `51-roles-ui.{js,css}`, assembled via `assemble.py`, tested via `qa/roles.js` + `qa/run.js`

## 9. Not done / next steps

- No backend → no automatic sync, no push, no real auth (see §5–6).
- Russian strings not yet verified by a Russian speaker.
- Real-device (phone) testing not done — jsdom only.
