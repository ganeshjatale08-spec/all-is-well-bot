# UI/UX Design — Saathi

**Companion docs:** FRONTEND_DESIGN.md (visual system/tokens), APP_FLOW.md (navigation)

This doc defines *how the product behaves and reads*. FRONTEND_DESIGN.md defines *how it looks*.

---

## 1. UX principles

1. **One glance, one action.** The home screen answers "how's my day?" and offers the next step in under two seconds.
2. **Reward, don't nag.** Feedback is encouraging; reminders only fire when they're actionable.
3. **Logging is the product.** Make it the fastest path in the app — never more than two taps to log water, three to log a meal.
4. **Progress is felt, not just shown.** Animation on the ring, count-ups, streaks, and "you vs last week" framing.
5. **The coach is calm and specific.** Never generic ("eat healthy"); always concrete ("you're 18g short on protein — add a katori of dal at dinner").

---

## 2. Information architecture

```
Home        → today's status (ring), yesterday's AI insight, quick log, streak
Journal     → today's entries by meal/category; add/edit; switch date
Insights    → trends + weekly/monthly reports
Profile     → metrics & goals, health profile, reminders, subscription, account/data
```

The center **⊕** is global quick-log, available from any tab.

---

## 3. Signature: the "Today Ring"

The emotional and functional anchor of Home (visual spec in FRONTEND_DESIGN.md §6).

- A single composite progress ring (concentric arcs) for the day's key goals: **calories/protein**, **movement** (steps/workout), **water**, **sleep**.
- **Center** holds the AI one-line coaching nudge (Pro) or the deterministic headline (Free) + the day's score.
- Arcs fill as the user logs; a gentle pulse plays on each new log.
- Tapping an arc opens the matching log sheet.

This replaces the generic "row of metric cards on top" pattern — the day is one object, not four.

---

## 4. Screen specs (behavior)

### Home
- Top: greeting + streak flame (with count).
- Center: **Today Ring** with score + coach line.
- Below: 3–4 compact "today" stats (calories left, protein, water, steps) — small, secondary to the ring.
- AI insight card (Pro) — headline + 1 recommendation + "tomorrow's focus." Free: locked card → contextual paywall.
- Primary CTA flows through ⊕.

### Journal
- Date switcher (today default; swipe to previous days).
- Sections: Meals (breakfast/lunch/dinner/snacks) with per-meal kcal/protein; Water; Workout; Sleep; Mood/Energy/Stress; Symptoms; Supplements.
- Each section: add button, inline edit, swipe to delete (with undo).
- Running daily totals pinned.

### Food log (modal)
- Search field (DB, fuzzy, Indian foods first; Hindi names searchable).
- Result row: name + serving + kcal/protein; tap → choose serving size + quantity → add.
- Recent/frequent foods at top for speed. "Can't find it?" → custom entry (name + macros) or (Advanced) photo.

### Insights
- Range toggle (week / month / 3-month).
- Charts: weight, score, steps, sleep, water, protein (line/bar; FRONTEND_DESIGN.md §7).
- Report cards: "This week" / "This month" → open full report. Locked for Free.

### Report (weekly/monthly)
- Score + period; achievements; improvement areas; key trends; narrative.
- Monthly adds next-month goals + **Export PDF** + **Share**.

### Profile
- Metrics & current goals (editable target weight, goal).
- Health profile (complete the optional Step 3 fields here).
- Reminders (times, quiet hours, toggles).
- Subscription (current plan, upgrade, restore, manage).
- Account & data: privacy policy, **export my data**, **delete account** (DPDP), sign out, disclaimer.

---

## 5. Interaction & motion

- Ring fill: spring animation on log (Reanimated). Respect `prefers-reduced-motion` (Health Connect/OS setting) → instant fill.
- Number transitions: count-up on metrics.
- Streak: subtle flame pulse when extended; honest, never fake.
- Haptics: light tap on successful log (where supported).
- Sheets: native bottom-sheet feel; large tap targets (≥44pt).

Keep motion minimal and purposeful — over-animation reads as gimmicky and drains battery.

---

## 6. Accessibility (quality floor)

- WCAG AA contrast for all text on the chosen palette (FRONTEND_DESIGN.md §2 lists pre-checked pairs).
- Dynamic type: layouts reflow with OS font scaling; never truncate critical numbers.
- All controls have `accessibilityLabel`/roles; ring exposes a text summary ("Today: 72 of 100. Water 1.2 of 3 litres.").
- Don't encode meaning in color alone — pair with icon/label (e.g., behind-on-water shows icon + text).
- Full keyboard/switch focus order on forms; visible focus.
- Minimum 44×44pt touch targets.

---

## 7. Copy voice (interface writing)

From the end-user's side of the screen, plain and active (see also FRONTEND_DESIGN.md philosophy):

- **Buttons say what happens:** "Log meal," "Save," "Start my day." Not "Submit."
- **Consistent verbs:** the action that says "Log water" produces a toast "Water logged."
- **Empty states invite action:** "No meals yet — add breakfast to start your score."
- **Errors are directional, not apologetic:** "Couldn't sync — we'll retry automatically. Your logs are saved on this phone."
- **Coach tone:** warm, specific, never shaming. "Tough day — that's fine. Tomorrow, aim for a 20-minute walk."
- **Safety voice:** for red-flag symptoms — "This is worth getting checked by a doctor soon," calm and clear, no diagnosis.

---

## 8. Localization readiness

- All strings via an i18n layer (en at launch; hi structured for v1.1).
- Numbers/units localized (kg, cm, litres, kcal). No hardcoded copy in components.

---

## 9. Theming

- Light and dark themes both first-class (people check the app at night). Tokens drive both (FRONTEND_DESIGN.md §2). Default to system theme.
