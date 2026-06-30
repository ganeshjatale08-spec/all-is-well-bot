# PRD — Saathi (AI Health Companion)

**Version:** 1.0 · **Status:** Ready for build · **Owner:** Founder
**Companion docs:** TRD.md, BACKEND_SCHEMA.md, APP_FLOW.md, UI_UX_DESIGN.md, FRONTEND_DESIGN.md

---

## 1. Vision

Most people don't fail at health because they lack information — they fail because nothing closes the loop between *what they did today* and *what to do tomorrow*. Saathi is a daily companion that watches the small signals (food, water, sleep, movement, mood, symptoms), scores the day, and gives **one clear, personal next step** — then rolls it up into weekly and monthly progress people can feel.

**One-line:** Your AI health companion for daily habits and monthly growth.

**Why now / why us:** The category is crowded with global apps that don't understand Indian food, vegetarian/Jain/eggetarian eating, or price sensitivity. Saathi is India-first on data, diet, language, and price (₹99 entry).

---

## 2. Target users

**Primary (v1):** individuals with one clear goal — weight loss, weight gain, muscle gain, general fitness, better sleep, diabetes-friendly habits, stress reduction. Age 18–55, smartphone-first, willing to log daily for 2–3 minutes.

**Secondary (v2+):** families managing health together; later, corporate wellness and senior tracking.

**Primary jobs-to-be-done:**
- "Tell me if today was good or bad for *my* goal, in seconds."
- "Tell me the one thing to fix tomorrow."
- "Show me I'm actually making progress over weeks/months."

---

## 3. Product principles

1. **Close the loop daily.** Every log produces feedback; every week/month produces direction.
2. **Numbers are computed, coaching is generated.** Deterministic math for all metrics; the LLM only for personal narrative and goals. (This is also the core cost decision — see §8 and TRD §4.)
3. **Low friction beats completeness.** A 60-second daily check-in that's done beats a perfect form that's abandoned.
4. **India-first.** Indian foods and diets are first-class, not an afterthought.
5. **Trustworthy, never preachy.** Encouraging coach, not a scold. Safe, never clinical overreach.

---

## 4. Feature scope by tier

### Free (acquisition funnel — no LLM cost)
- Onboarding + automatic health metrics: BMI, BMR, TDEE, ideal-weight range, daily targets (calorie/protein/water/sleep) — all **formula-based**
- Daily journal: food (from nutrition DB), water, sleep, steps/workout, mood, symptoms
- Deterministic **daily health score** (rule-based, no AI) + progress charts
- Streaks and basic badges
- 7-day history

### Pro — ₹99/mo (or ₹799/yr)
Everything in Free, plus the AI layer:
- **AI daily analysis:** narrative insight + personalized recommendation + tomorrow's focus
- **Weekly AI report:** summary, achievements, improvement areas
- **Monthly AI report:** trends + insights, PDF export + shareable link
- **Monthly AI goal generator:** next-month targets
- Full history, all badges

### Family — ₹299/mo (₹2,499/yr)
Everything in Pro for **up to 5 members**, plus:
- Family dashboard (each member's status at a glance)
- Per-member reports
- Health alerts (e.g., a member's streak broken / concerning symptom logged) to the family admin
- One bill, shared via RevenueCat family entitlement

### Advanced — ₹599/mo
Everything in Pro for one user, plus the heavier/multimodal features:
- **Food photo analysis** (snap a meal → macros), capped at 100 photos/mo
- **Blood report analysis** (upload report → plain-language summary + flags), 5/mo
- **Smartwatch sync** (Google Fit / Health Connect; Apple Health)
- Advanced analytics and longer trend windows
- Priority processing

> Tier rules live in code as feature flags / RevenueCat entitlements. Free tier must trigger **zero** Gemini calls (see TRD §4).

---

## 5. MVP (Release 1.0) — deliberately lean

Ship the core loop only. Everything else is v1.1+.

**In:**
1. Auth (email + Google; phone OTP optional) and progressive onboarding
2. Automatic metrics (BMI/BMR/TDEE/targets)
3. Daily journal (food via DB, water, sleep, steps/workout, mood, symptoms)
4. Deterministic daily score + home "Today Ring" + trend charts
5. AI daily analysis (Pro)
6. Weekly report (Pro)
7. Monthly report + PDF/share (Pro)
8. Monthly goal generator (Pro)
9. Subscriptions (Free + Pro) via RevenueCat
10. Notifications (morning targets, afternoon water/activity, night journal reminder)

**Explicitly out of MVP (v1.1+):** Family plan, Advanced tier (food photo, blood report, smartwatch), voice assistant, regional languages beyond English/Hindi, corporate/senior modes. Build the schema so these slot in later (see BACKEND_SCHEMA.md), but don't build the UI yet.

---

## 6. Onboarding (progressive — minimize drop-off)

Ask the **minimum to deliver value**, then collect the rest over the first week.

**Step 1 (required, ~30s):** name, age, sex, height, weight, primary goal.
→ Immediately show computed BMI/BMR/TDEE + targets. *Aha moment before any signup friction where possible.*

**Step 2 (light):** diet type (veg/non-veg/eggetarian/vegan/jain), activity level, target weight.

**Step 3 (optional, skippable, surfaced over days):** medical conditions, family history, allergies, medications, sleep/water baselines, work type, screen time, stress, energy. Each can be filled later from Profile; nudge gently.

Never block the first daily check-in on optional fields.

---

## 7. AI features — expected outputs (contract)

All AI returns **structured JSON** (see TRD §5) so the app renders it reliably.

- **Daily analysis:** `health_score` (0–100, reconciled with the deterministic score), short `headline`, `insight` (2–3 sentences), `recommendation` (1 concrete action), `tomorrow_focus` (1 line). Inputs: profile context + that day's log + computed metrics.
- **Weekly report:** `weekly_score`, totals (steps, workouts, sleep avg, water avg), `achievements[]`, `improvement_areas[]`, short narrative.
- **Monthly report:** weight progress, averages (sleep/steps/protein/water), `score_trend`, `insights[]`; exportable to PDF + shareable link.
- **Goal generator (monthly):** target weight, daily step goal, sleep goal, water goal, protein goal, workout goal, sugar-reduction goal — with a one-line rationale each.

---

## 8. The cost & margin model (product-level)

Unit economics at ₹99 are healthy **only if** we (a) keep the LLM off the free tier, and (b) compute numbers deterministically. Reference figures (verified pricing; ~₹94.4/USD):

- Engaged Pro user AI cost: **~₹13–15/month** on Gemini 2.5 Flash, text only.
- With caching + batch + Flash-Lite for daily: **~₹4–6/month**.
- Per-user contribution at ₹99 after store + API + infra: **~₹52–79/month** (53–80% margin) depending on channel.

**The real risks are CAC and churn, not API cost.** Product decisions that protect this: free tier hooks habit before paywall; annual plans to extend LTV; referral loop; onboarding-to-habit conversion is the north-star activation metric. See TRD §4 for the engineering controls.

---

## 9. Safety, ethics & compliance (must-have, not optional)

- **Not a medical device.** Persistent, plain disclaimer at onboarding and in reports.
- **AI guardrails:** never diagnose, never prescribe or give medication dosing, never contradict a clinician. For red-flag symptoms (e.g., chest pain, severe/persistent symptoms, very high logged values) the AI must advise seeing a doctor and avoid reassurance. Encoded in the system prompt + a server-side safety check (TRD §5, §10).
- **Eating-disorder safety:** no extreme-deficit advice; floor on calorie recommendations; supportive tone; avoid numeric targets that could harm. If self-harm/ED signals appear, surface supportive resources, not diet plans.
- **DPDP Act, 2023 (India):** explicit consent, data minimization, purpose limitation, right to access/erase, secure storage, and a clear privacy policy. Health data is sensitive — encrypt at rest/in transit, least-privilege access (RLS).
- **Children:** 18+ only at launch; no accounts for minors.

---

## 10. Success metrics

**Activation:** % of new users who complete onboarding AND log day 1 AND return day 2 (north star).
**Engagement:** DAU, journal completion rate, 7-day and 30-day retention, streak length.
**Health outcomes (self-reported/measured):** weight-goal progress, sleep/hydration/activity improvement over 4 weeks.
**Business:** free→Pro conversion %, ARPU, annual-plan mix, Family adoption (v1.1), CAC, LTV, payback months, gross margin/user.

**Launch targets (first 90 days, directional):** D2 retention > 40%, D30 retention > 20%, free→paid > 3%, journal completion (active users) > 60%.

---

## 11. Open decisions (resolve before/along build)

- Phone OTP at launch or post-MVP? (High trust in India, adds Twilio/MSG91 cost.)
- Nutrition DB source: license vs build a curated IFCT-based seed for top ~1,500 Indian foods. (MVP: curated seed; expand later.)
- Hindi at launch or v1.1?
- Direct web subscription (Razorpay) in addition to store IAP, to dodge the store cut for web signups?
