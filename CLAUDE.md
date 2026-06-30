# CLAUDE.md — Operating Guide for Claude Code

This file governs how you (Claude Code) build **Saathi**. Read it fully before writing code. Keep it open. When in doubt, the docs in this repo win over your assumptions.

> **Expo SDK note:** this project pins **Expo SDK 56**, a recent release that postdates most training data. Before writing Expo/React Native/Expo Router code, check the versioned docs at https://docs.expo.dev/versions/v56.0.0/ rather than relying on memory — APIs (especially Router, fonts, notifications) have changed across SDKs.

**Source-of-truth docs:** `PRD.md` (what), `TRD.md` (how), `BACKEND_SCHEMA.md` (data), `APP_FLOW.md` (navigation), `UI_UX_DESIGN.md` (behavior), `FRONTEND_DESIGN.md` (look), `PROGRESS.md` (tasks/status).

---

## What we're building (1 paragraph)

A cross-platform (Expo/React Native) AI health companion for the Indian market. Users log food/water/sleep/movement/mood/symptoms; the app computes metrics and a daily score **with formulas**, and uses **Gemini (via a Supabase Edge Function only)** to write the coaching narrative, weekly/monthly reports, and goals. Tiers: Free / Pro ₹99 / Family ₹299 / Advanced ₹599.

---

## Stack (don't substitute without asking)

Expo + Expo Router · NativeWind v4 · TanStack Query · Zustand · react-hook-form + zod · react-native-gifted-charts + react-native-svg + reanimated · lucide-react-native · Supabase (Postgres/Auth/Edge/Storage/cron) · Gemini via `@google/genai` (server) · RevenueCat + native IAP · expo-notifications · expo-print + expo-sharing. Install native/Expo deps with `npx expo install` so versions match the SDK.

---

## HARD RULES (do not break)

1. **Never call Gemini from the client.** All AI goes through Supabase Edge Functions. The Gemini key lives only in server env. Never put secrets in `EXPO_PUBLIC_*` (those ship to the device).
2. **Never use the LLM for arithmetic.** BMI, BMR, TDEE, targets, calorie/macro totals, and the daily score are **pure functions in `src/domain/`**. The LLM only generates language (insight, recommendation, report narrative, goal rationale). Pass computed numbers *into* prompts; never ask the model to compute them. (This is the margin model — TRD §4 / PRD §8.)
3. **Free tier triggers zero Gemini calls.** Gate every Edge Function on a Pro+ entitlement, server-side.
4. **RLS on every table.** A user accesses only their own rows (family access via the documented policy). Edge Functions use service role and must enforce ownership/entitlement in code.
5. **Structured JSON from Gemini always** (`responseSchema`). Validate with the matching zod schema; repair/replace on malformed output. Run the **safety post-check** (no diagnosis/dosing; escalate red flags) before storing.
6. **Safety first in health copy.** Not a medical device. Never diagnose or prescribe. For red-flag symptoms, advise seeing a doctor; no false reassurance. No extreme-deficit/ED-triggering advice; floor calorie recommendations.
7. **Logging never blocks on AI or network.** Optimistic, offline-first; deterministic score shows instantly; AI insight is async/batch and non-blocking.
8. **DPDP compliance.** Capture consent; implement data export + account deletion (cascades); minimize stored PII; don't log health content or tokens.
9. **Idempotent AI writes.** Key daily analysis by `(user_id, date)`; don't regenerate (saves cost). Same for reports/goals by period.
10. **Tokens via design system.** Use semantic NativeWind tokens (FRONTEND_DESIGN.md), never raw hex/inline magic numbers in components.

---

## Conventions

- **Language:** TypeScript everywhere; strict mode on. No `any` without a comment.
- **Naming:** files kebab-case; components PascalCase; hooks `useX`; zod schemas `xSchema`; DB snake_case.
- **Data access:** all reads/writes via TanStack Query hooks in `src/hooks` or feature folders. No raw Supabase calls scattered in components.
- **Pure logic:** lives in `src/domain/` — no imports from UI/network there. It must be unit-tested.
- **Schemas shared:** zod schemas in `src/schemas` are the contract for forms *and* Edge Function I/O. Mirror them server-side.
- **Components:** presentational kit in `src/components/ui`; feature UI in `src/features/*`. Keep the kit token-driven and reusable.
- **State:** server state → TanStack Query; transient UI/wizard → Zustand. Don't duplicate server data in Zustand.
- **Errors:** user-facing copy is directional, in the interface voice (UI_UX_DESIGN §7). Log technical errors without PII.
- **Accessibility & theme:** every screen ships light+dark, dynamic-type-safe, ≥44pt targets, labels on controls, reduced-motion respected.

---

## Folder structure

See FRONTEND_DESIGN.md §10 (routes in `src/app`, kit in `src/components/ui`, pure logic in `src/domain`, features in `src/features`, server clients in `src/lib`). Edge Functions in `supabase/functions/<name>`; migrations in `supabase/migrations`.

---

## How to work (process)

1. Work **one phase at a time** from `PROGRESS.md`. After each phase: run lint + type-check + tests, summarize what changed, then stop for review.
2. **Tick checkboxes** in `PROGRESS.md` as you finish tasks; add any new tasks you discover.
3. Before building a screen, re-read its spec in APP_FLOW + UI_UX_DESIGN + FRONTEND_DESIGN.
4. Before touching data, re-read BACKEND_SCHEMA.md; write a migration, don't hand-edit the DB.
5. Prefer small, reviewable commits with clear messages (`feat:`, `fix:`, `chore:`, `refactor:`).
6. If a requirement is ambiguous or a doc conflicts with reality, **ask** — don't guess on health/safety, money/entitlements, or data model.
7. Don't add dependencies casually; justify any new one.

---

## Commands

```bash
npm install
npx expo start                 # run app (dev build once RevenueCat/Health added)
npm run lint                   # eslint
npm run typecheck              # tsc --noEmit
npm run test                   # jest (domain logic must pass)
supabase start                 # local stack (optional)
supabase db reset              # apply migrations + seed
supabase functions serve       # run edge functions locally
eas build / eas submit         # builds & store submission
```

---

## Definition of done (per feature)

- Matches the relevant doc specs (flow, behavior, look).
- Types pass, lint clean, domain logic unit-tested.
- Light + dark + dynamic type + a11y labels.
- No secret in client; no LLM math; Free-tier gated; RLS enforced.
- `PROGRESS.md` updated.

---

## Things you must NOT do

- Don't bypass the Edge Function to call Gemini "just for testing" in the client.
- Don't compute health numbers in a prompt.
- Don't ship a launch-blocking paywall (paywall is contextual).
- Don't use Recharts (web) or PDFKit (Node) — use the RN/Expo replacements in TRD §2.
- Don't store raw blood reports/food photos in public buckets.
- Don't build Family/Advanced UI during MVP (schema-only).
