# PROGRESS — Saathi Build Tracker

Build **one phase at a time**. After each phase: lint + typecheck + test, commit, review, then continue. Tick boxes as you go and add tasks you discover. Status legend: `[ ]` todo · `[~]` in progress · `[x]` done.

**Current phase:** Phase 2
**MVP = Phases 0–7.** Phases 8–9 are post-MVP (v1.1).

---

## Phase 0 — Foundation & setup
- [x] Init Expo app (TypeScript, Expo Router) + repo, `.gitignore`
- [x] Add NativeWind v4; wire tokens into `tailwind.config.js` (FRONTEND_DESIGN §9)
- [x] Install core deps via `npx expo install` (svg, reanimated, gifted-charts, lucide, fonts, secure-store, notifications, print, sharing)
- [x] Load fonts (Sora, Plus Jakarta Sans) via expo-font
- [x] Theme layer: light/dark tokens + reduce-motion hook (`lib/theme.ts`)
- [x] Supabase project; `lib/supabase.ts`; `.env.example` (client public vars only)
- [x] Tooling: ESLint, Prettier, tsconfig strict, Jest; scripts `lint`/`typecheck`/`test`
- [x] Scaffold folders per FRONTEND_DESIGN §10
- [x] Confirm/commit the commands block in CLAUDE.md

## Phase 1 — Auth & data layer
- [x] Supabase Auth: email sign-up/in, Google OAuth (phone OTP optional flag)
- [x] Session handling, protected route groups, sign-out clears secure store
- [x] TanStack Query provider + `lib/queryClient.ts`
- [x] Migrations: enums + `profiles` + `health_profiles` (BACKEND_SCHEMA §1–2) with RLS + updated_at triggers
- [x] Welcome / Sign-in / Sign-up screens (FRONTEND_DESIGN look)
- [x] zod schemas for auth + profile in `src/schemas`

## Phase 2 — Onboarding & metrics (deterministic core)
- [ ] `domain/metrics.ts`: BMI, BMR (Mifflin-St Jeor), TDEE, ideal-weight, targets — **unit tested, exact**
- [ ] Onboarding wizard: Step 1 basics (required) → Result → Step 2 lifestyle → Step 3 health (skippable) → Consent (APP_FLOW §3)
- [ ] Persist profile/health_profile; set `onboarding_complete`, `consent_dpdp_at`
- [ ] Result screen shows computed metrics + targets (the activation moment)
- [ ] Progressive-completion entry points in Profile for Step 3 fields

## Phase 3 — Daily journal & scoring
- [ ] Migrations: `daily_logs` + `food_entries`/`water_entries`/`supplement_entries`/`workout_entries`/`symptom_entries`, `foods` (BACKEND_SCHEMA §3–4) + RLS + pg_trgm
- [ ] Seed `foods` (curated IFCT-based ~1,500 Indian + common items)
- [ ] `domain/nutrition.ts`: macro summing (tested) · `domain/scoring.ts`: deterministic daily score (tested)
- [ ] UI kit: Card, Button, Stat, Input, Stepper, Slider, BottomSheet, ActionSheet, Toast, EmptyState (FRONTEND_DESIGN §5)
- [ ] **Today Ring** component (svg + reanimated; FRONTEND_DESIGN §6) with a11y summary
- [ ] Home screen: ring + today stats + streak + ⊕ quick-log
- [ ] Journal screen + all log sheets (food search, water, sleep, workout, mood, symptom)
- [ ] Offline-first writes + background sync (TRD §7); instant score update
- [ ] `streaks` table + streak logic; basic badges (`badges`/`user_badges`)

## Phase 4 — AI daily analysis (Edge Function)
- [ ] Edge Function scaffolding; shared Gemini client (`@google/genai`), prompt assembly, caching helper
- [ ] Migration: `ai_analyses` + `ai_usage` (BACKEND_SCHEMA §5,§7) + RLS
- [ ] `daily-analysis` function: entitlement gate → load profile(cached)+today+score → responseSchema → safety post-check → store (idempotent) → log usage (TRD §5)
- [ ] Model = 2.5 Flash-Lite; context caching; tight token budget
- [ ] pg_cron overnight batch for Pro users → Batch API (50% off)
- [ ] Home AI insight card (Pro); LockedCard for Free → contextual paywall
- [ ] Verify Free tier makes **zero** Gemini calls

## Phase 5 — Reports & goals
- [ ] Migrations: `reports`, `goals` (BACKEND_SCHEMA §5) + RLS
- [ ] `weekly-report` function (Flash-Lite) + Sunday cron + notification
- [ ] `monthly-report` function (2.5 Flash) + month-end cron
- [ ] `goal-generator`: numeric goals from formulas, LLM frames rationale; store in `goals`
- [ ] Insights tab: trend charts (gifted-charts) + range toggle + report cards
- [ ] Report screen; **PDF export** (expo-print) + **share link** (signed URL + `share_token`)

## Phase 6 — Subscriptions
- [ ] RevenueCat setup; products Pro/Family/Advanced (monthly + annual) in App Store Connect & Play Console
- [ ] `lib/revenuecat.ts`; entitlement hook `useEntitlement`
- [ ] Migration: `subscriptions` + RLS; RevenueCat webhook → update row
- [ ] Contextual Paywall screen (annual highlighted); restore purchases in Profile
- [ ] Feature gates wired to entitlements across the app
- [ ] Enroll in App Store / Play **small-business 15%** programs

## Phase 7 — Notifications, polish, launch-prep
- [ ] `device_tokens` + expo-notifications registration
- [ ] Local reminders (morning/afternoon/night), user-configurable + quiet hours (APP_FLOW §8)
- [ ] "Report ready" push
- [ ] Profile: reminders settings, subscription mgmt, **export data**, **delete account** (DPDP cascade), privacy policy, disclaimer
- [ ] Empty/offline/AI-failure states (APP_FLOW §9)
- [ ] Accessibility + dark theme + dynamic-type pass on all screens
- [ ] Performance pass (FlashList, memoized charts, 60fps ring)
- [ ] E2E happy path (mock AI) + domain tests green
- [ ] EAS builds; store listings, privacy labels, screenshots; submit

---

## Phase 8 — Family plan (v1.1)
- [ ] Migrations live for `family_groups`/`family_members` + family RLS (BACKEND_SCHEMA §8,§10)
- [ ] Group create + invite (link/code) + accept
- [ ] Family dashboard (members' daily status, streaks)
- [ ] Per-member reports (gated) + health alerts push
- [ ] RevenueCat family entitlement (up to 5)

## Phase 9 — Advanced tier (v1.1)
- [ ] `food-photo` Edge Function (multimodal; structured macros) + cap 100/mo; `food-photos` bucket
- [ ] `blood-report` Edge Function (summary + flags; safety-checked) + cap 5/mo; `blood-reports` bucket
- [ ] Smartwatch sync: Health Connect (Android) + HealthKit (iOS)
- [ ] Advanced analytics + longer trend windows + priority processing

---

## Backlog / later
- [ ] Hindi localization (i18n already structured)
- [ ] Voice health assistant
- [ ] Direct web subscription (Razorpay) to avoid store cut for web signups
- [ ] Corporate wellness / senior modes

---

## Decisions log (record as you go)
- [ ] Phone OTP at launch? (decision: …)
- [ ] Nutrition DB: curated seed vs licensed source (decision: …)
- [ ] Hindi at launch vs v1.1 (decision: …)
- [ ] Daily AI batch time / quiet hours default (decision: …)

## Notes for next session
> Leave a short note here at the end of each session: what's done, what's next, any blockers.
