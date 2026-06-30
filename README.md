# Saathi — AI Health Companion

> Working product name: **Saathi** ("companion" in Hindi). Rename freely — repo/package id used in docs is `saathi`.

Saathi is a mobile-first AI health companion. People log food, water, sleep, movement, mood and symptoms each day; Saathi turns that into a daily health score, a one-line coaching nudge, and weekly/monthly reports with next-period goals. Built for the Indian market first (Indian foods, vegetarian/Jain/eggetarian diets, regional context), priced from ₹99/month.

---

## How to use these documents with Claude Code

Read them in this order. Each is a source of truth for one layer of the build.

| # | File | What it defines | Read when |
|---|------|-----------------|-----------|
| 1 | **PRD.md** | Product vision, users, tiers/pricing, feature scope, MVP cut, success metrics, safety rules | Start here — the "why" and "what" |
| 2 | **TRD.md** | Architecture, stack, the cost architecture (deterministic vs LLM), Gemini integration, security | The "how it's engineered" |
| 3 | **BACKEND_SCHEMA.md** | Full PostgreSQL schema + RLS + indexes (Supabase) | Before writing any backend or migrations |
| 4 | **APP_FLOW.md** | Every screen, navigation, and the end-to-end user flows | Before wiring navigation |
| 5 | **UI_UX_DESIGN.md** | Information architecture, screen specs, UX patterns, accessibility, copy voice | Before building screens |
| 6 | **FRONTEND_DESIGN.md** | Design system: tokens, type, components, RN libraries, folder structure | Alongside UI/UX, before styling |
| 7 | **CLAUDE.md** | Operating rules for Claude Code: conventions, hard rules, commands | Keep open the whole time |
| 8 | **PROGRESS.md** | Phased build plan with checkboxes — the task tracker | Update after every task |

### Recommended Claude Code workflow

1. Put all these files in the repo root (or a `/docs` folder, with `CLAUDE.md` and `README.md` in root).
2. Start a Claude Code session and say: *"Read CLAUDE.md, PRD.md, TRD.md and PROGRESS.md. Then begin Phase 0 in PROGRESS.md. Tick boxes as you complete them and stop after each phase for review."*
3. Work **one phase at a time**. Review, commit, then continue. Don't let it build everything in one shot.

---

## Product at a glance

- **Platforms:** Android + iOS (one codebase, React Native + Expo)
- **Backend:** Supabase (Postgres, Auth, Edge Functions, Storage, Scheduled jobs)
- **AI:** Google Gemini (2.5 Flash-Lite for daily, 2.5 Flash for monthly) — called only from a secure Edge Function, never the client
- **Pricing:** Free → Pro ₹99/mo → Family ₹299/mo → Advanced ₹599/mo
- **The one rule that protects margins:** numbers (BMI/BMR/TDEE/calories/macros) are computed by **deterministic formulas + a nutrition database**, never by the LLM. The LLM only writes the coaching narrative and goals. See TRD §4.

---

## Quick start (filled in during Phase 0)

```bash
# Prereqs: Node LTS, Git, Expo CLI, a Supabase project, a Google AI (Gemini) API key
git clone <repo>
cd saathi
npm install
cp .env.example .env        # fill Supabase + (server-side) Gemini keys
npx expo start              # run the app (Expo Go or dev build)
```

Environment variables and full setup live in **TRD.md §11** and are scaffolded in Phase 0 of **PROGRESS.md**.

## Legal / safety

Saathi is a wellness and habit-tracking product, **not a medical device** and **not a substitute for professional medical advice**. AI output must never diagnose, prescribe, or give medication dosing, and must escalate red-flag symptoms to "see a doctor." Data handling follows India's DPDP Act, 2023. See **PRD §9** and **TRD §10**.
