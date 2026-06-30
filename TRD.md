# TRD — Saathi (AI Health Companion)

**Version:** 1.0 · **Companion docs:** PRD.md, BACKEND_SCHEMA.md, FRONTEND_DESIGN.md, CLAUDE.md

---

## 1. Architecture overview

```
┌──────────────────────────────┐
│  Mobile app (Expo / RN)      │
│  Expo Router · NativeWind     │
│  TanStack Query + Zustand     │
│  Supabase JS client           │
└───────────────┬───────────────┘
                │ HTTPS (anon key + user JWT)
                ▼
┌──────────────────────────────────────────────┐
│  Supabase                                       │
│  • Postgres (RLS-protected)                     │
│  • Auth (email, Google OAuth, optional phone)   │
│  • Storage (blood reports, food photos)         │
│  • Edge Functions (Deno) ── the ONLY caller ──┐ │
│  • Scheduled jobs (pg_cron) for batch reports │ │
└───────────────────────────────────────────────┼─┘
                                                 │ server-side key
                                                 ▼
                                   ┌────────────────────────┐
                                   │  Google Gemini API     │
                                   │  2.5 Flash-Lite (daily) │
                                   │  2.5 Flash (monthly)    │
                                   └────────────────────────┘
RevenueCat  ←→  App Store / Play Billing  (subscriptions/entitlements)
Expo Push (FCM/APNs)  ←  scheduled notifications
```

**Key boundary:** the Gemini API key lives **only** in Edge Functions / server env. The mobile app never holds it and never calls Gemini directly.

---

## 2. Tech stack (corrected for Expo)

| Layer | Choice | Notes |
|------|--------|------|
| Framework | **React Native + Expo (managed)** | Use a **dev build** (EAS) once native deps (RevenueCat, Health) are added |
| Navigation | **Expo Router** (file-based) | |
| Styling | **NativeWind v4** (Tailwind for RN) | Design tokens map to `tailwind.config.js` (see FRONTEND_DESIGN.md) |
| Server state | **TanStack Query** | All Supabase reads/writes go through query/mutation hooks |
| Local/UI state | **Zustand** | Lightweight; onboarding wizard, transient UI |
| Forms + validation | **react-hook-form + zod** | Zod schemas shared with Edge Function validation |
| Charts | **react-native-gifted-charts** (+ `react-native-svg`) | line/bar/donut trends |
| Signature ring | Custom component on **react-native-svg** + **react-native-reanimated** | the "Today Ring" |
| Icons | **lucide-react-native** | |
| Backend | **Supabase** | Postgres + Auth + Edge Functions + Storage + Scheduled |
| AI | **Google Gemini** via `@google/genai` (in Edge Function) | model tiering, caching, batch |
| Subscriptions | **RevenueCat** + native IAP | cross-platform entitlements, trials, family sharing |
| Notifications | **expo-notifications** (Expo Push → FCM/APNs) | |
| PDF | **expo-print** (HTML→PDF) + **expo-sharing** | replaces PDFKit (Node-only) for client export; monthly report can also be rendered server-side |
| Secure storage | **expo-secure-store** (tokens) + **MMKV/AsyncStorage** (cache) | |
| Health data (Advanced) | **react-native-health-connect** (Android) + Apple **HealthKit** | v1.1 |

> **Stack corrections vs original brief:** *Recharts* is web-only → replaced with `react-native-gifted-charts`. *PDFKit* is Node/iOS-only → replaced with `expo-print`. *Firebase Cloud Messaging* is reached via `expo-notifications` (Expo Push wraps FCM/APNs), so you don't integrate the raw FCM SDK.

Pin versions via `npx expo install` (it resolves Expo-compatible versions). Don't hardcode versions that fight the Expo SDK.

---

## 3. Module breakdown

- **auth** — sign up / in, session, OAuth, optional phone OTP.
- **onboarding** — progressive wizard; writes profile + health_profile; triggers metric calc.
- **metrics** (pure, client + server shared) — BMI, BMR, TDEE, ideal weight, targets. No network, no LLM.
- **journal** — CRUD for the day's entries (food/water/sleep/workout/steps/mood/symptoms).
- **nutrition** — search `foods` table; compute calories/macros by summing entries × servings.
- **scoring** (pure) — deterministic daily score from targets vs actuals.
- **ai** — client calls Edge Functions (`daily-analysis`, `weekly-report`, `monthly-report`, `goal-generator`, `food-photo`, `blood-report`); never Gemini directly.
- **reports** — render weekly/monthly; PDF + share.
- **subscriptions** — RevenueCat entitlements → feature gates.
- **notifications** — schedule + handle.
- **family** (v1.1) — groups, member dashboards, alerts.

---

## 4. Cost architecture (the most important section)

**Rule: compute numbers, generate only language.** The LLM is expensive and bad at arithmetic; formulas are free and exact.

**4.1 Deterministic (no LLM, runs on device/DB):**
- BMI = `kg / (m^2)`
- BMR (Mifflin-St Jeor): male `10w + 6.25h − 5a + 5`; female `10w + 6.25h − 5a − 161`
- TDEE = BMR × activity factor (1.2 / 1.375 / 1.55 / 1.725)
- Calorie/macro totals = `Σ(food.per_serving_macros × servings)` from the `foods` table
- Targets (calorie deficit/surplus by goal, protein g/kg, water by weight, sleep need) = formulas
- **Daily health score** = weighted rule function over (calories vs target, protein %, water %, sleep %, activity %, symptom penalty). 100% deterministic.

**4.2 LLM (Gemini) — only the qualitative layer:**
- Daily *narrative* insight + 1 recommendation + tomorrow's focus
- Weekly/monthly *narrative* + achievements/areas
- Goal-generator *rationale* (the numeric goals are formula-derived; the LLM frames and prioritizes them)

**4.3 Engineering controls (apply all):**
1. **Free tier = zero LLM.** Gate every Edge Function on a Pro+ entitlement.
2. **Model tiering:** daily/weekly → **Gemini 2.5 Flash-Lite** ($0.10/$0.40 per 1M tok); monthly + goals → **2.5 Flash** ($0.30/$2.50). (Verified pricing.)
3. **Context caching:** cache the system prompt + the user's profile block; cached input reads cost ~10% of input price. Re-use across the month.
4. **Batch generation:** daily analyses for Pro users are **not** real-time — generate overnight via `pg_cron` → Edge Function → Gemini **Batch API (50% off)**. User sees it on morning open.
5. **Tight token budgets:** send only the day's log + compact profile; cap `maxOutputTokens`; keep thinking budget minimal for structured tasks.
6. **Cache photo/report results:** store structured macros so a meal isn't re-analyzed.
7. **Per-tier caps:** Advanced food-photo 100/mo, blood-report 5/mo, enforced server-side.

**4.4 Target cost per engaged Pro user:** ~₹4–6/month after controls (₹13–15 unoptimized). Keep an `ai_usage` log (tokens, model, cost estimate) per call to monitor real spend.

---

## 5. Gemini integration (Edge Functions)

- One Edge Function per task; shared helpers for client init, prompt assembly, caching, and **structured output**.
- **Always use structured JSON output** via `responseSchema` / `responseMimeType: "application/json"`. Define each schema with zod on the client and mirror it in the function; reject/repair malformed output.
- **System prompt** encodes: role (supportive coach), India context, the safety guardrails (§9 PRD), and "use the provided computed numbers; do not recalculate." Numbers are passed in, not asked for.
- **Safety post-check:** after generation, run a lightweight server-side check for disallowed content (diagnosis/dosing/red-flag mishandling); if triggered, replace with a safe templated message + "see a doctor."
- **Idempotency:** key daily analysis by `(user_id, date)`; don't regenerate if present (saves cost).
- **Failure handling:** on API error/timeout, the day still shows the deterministic score + a templated nudge; AI insight retries in next batch.

Pseudocode (daily-analysis):
```ts
// 1. authz: require Pro+ entitlement (RevenueCat/user row)
// 2. load: profile(cached), today's log, computed metrics+score
// 3. if analysis exists for (user,date) -> return it
// 4. call Gemini (Flash-Lite) with cached system+profile, today's data, responseSchema
// 5. safety post-check -> store in ai_analyses -> log ai_usage -> return
```

---

## 6. Data flow per day

1. User logs entries → rows in `daily_logs` children (food/water/etc.).
2. Client computes metrics + deterministic score (instant feedback; works offline-first, syncs).
3. Overnight `pg_cron` collects Pro users with a completed/active day → enqueues batch → `daily-analysis` writes `ai_analyses`.
4. Morning open → app shows Today Ring (yesterday's AI insight + today's targets) and trends.
5. Sunday night → `weekly-report`. Month end → `monthly-report` + `goal-generator`.

---

## 7. Offline & sync

- Journal must work offline: optimistic local writes (MMKV) → sync to Supabase when online (TanStack Query mutations with retry).
- Reads cached; charts render from cache first.
- Conflict policy: last-write-wins per entry (entries are user-owned, low conflict).

---

## 8. Notifications

- `expo-notifications` for local scheduled reminders (morning targets, afternoon water/activity, night journal). Times user-configurable; respect quiet hours.
- Server push (Expo Push) for: "your weekly report is ready," family alerts (v1.1).
- Store device push tokens in `device_tokens`.

---

## 9. Performance

- Cold start < 2.5s on mid-range Android; home interactive < 1s after warm.
- Lists virtualized (`FlashList`). Memoize chart data. Avoid re-renders on the ring (Reanimated worklet).
- Images (food photos) compressed before upload; Storage with signed URLs.

---

## 10. Security & compliance

- **RLS on every table** (see BACKEND_SCHEMA.md): a user reads/writes only their rows; family members access via group membership policy.
- **Secrets:** Gemini key, RevenueCat secret only in Edge Function env / EAS secrets. Never in the app bundle or client env (`EXPO_PUBLIC_*` is public!).
- **DPDP Act, 2023:** consent capture at onboarding, privacy policy, data export + delete endpoints (account deletion cascades), data minimization, encryption in transit (TLS) and at rest (Supabase/Postgres).
- **Sensitive uploads** (blood reports) in a private bucket; signed, expiring URLs; delete on request.
- **Auth:** short-lived JWT, refresh handled by Supabase; sign-out clears secure store.
- **PII in logs:** never log health content or tokens; `ai_usage` stores counts/costs, not raw prompts with PII (or redact).

---

## 11. Environments & config

`.env.example` (client — only public-safe values):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=
```

Edge Function / server secrets (NOT public):
```
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
```

- **EAS** for builds/submits; dev build required after adding RevenueCat/Health.
- Migrations via Supabase CLI (`supabase/migrations`), seeded with the curated `foods` table.

---

## 12. Testing

- **Pure logic** (metrics, scoring, nutrition sums): unit tests — these must be exact (Jest).
- **Edge Functions:** test schema validation + safety post-check with fixtures.
- **E2E happy path:** onboarding → log → score → (mock AI) insight (Maestro or Detox).
- **Entitlement gates:** verify Free triggers no Edge Function calls.

---

## 13. Analytics

- Privacy-respecting product analytics (e.g., PostHog) for activation/retention funnels (PRD §10). No health content in events — counts and states only.
