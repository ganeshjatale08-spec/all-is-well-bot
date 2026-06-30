# Frontend Design — Saathi

**Companion docs:** UI_UX_DESIGN.md (behavior), TRD.md (stack)

A distinctive, intentional visual system — not the default health-app teal. The direction is **"calm canvas, confident numbers, one living ring."**

---

## 1. Design thesis

This is a daily, two-minute ritual checked in the morning and at night. It should feel like a **calm, encouraging coach**, not a clinical dashboard. So:

- The **numbers are the hero** — large, confident, tabular. This is a tracking app; the data earns the spotlight.
- The **Today Ring** is the single signature element; everything else stays quiet around it.
- Warm-neutral canvas (not stark white, not the AI-default cream), evergreen ink, one fresh green for "go/health," one warm coral for "energy/momentum/streaks," calm blue for rest/hydration data.

Spend boldness only on the ring. Keep the rest disciplined.

---

## 2. Color tokens

Named palette (light theme). All body/label text pairs below meet WCAG AA on their stated background.

| Token | Hex | Use |
|------|-----|-----|
| `canvas` | `#F6F8F4` | app background (warm-neutral, faint green) |
| `surface` | `#FFFFFF` | cards, sheets |
| `surface-sunken` | `#EEF1EB` | inputs, track behind ring arcs |
| `ink` | `#14201B` | primary text (deep evergreen-black) |
| `ink-muted` | `#5C6B63` | secondary text, captions |
| `primary` | `#12A06A` | brand, positive actions, "go" (fresh green) |
| `primary-press` | `#0C8757` | pressed/active primary |
| `energy` | `#FF7A4D` | streaks, motivation, calories arc, attention |
| `cool` | `#4C8DF5` | sleep + water data, rest |
| `warn` | `#E0A82E` | symptoms, gentle caution |
| `danger` | `#D8503C` | destructive (delete account), red-flag |
| `hairline` | `#E2E7DD` | borders, dividers |

**Dark theme**

| Token | Hex |
|------|-----|
| `canvas` | `#0E1512` |
| `surface` | `#16201B` |
| `surface-sunken` | `#1E2A24` |
| `ink` | `#EAF1EC` |
| `ink-muted` | `#9DB0A6` |
| `primary` | `#2DBE83` |
| `energy` | `#FF8C63` |
| `cool` | `#6AA0F7` |
| `hairline` | `#26332C` |

**Ring arc colors:** calories/protein → `energy`; movement → `primary`; water → `cool`; sleep → a softened `cool` / indigo. Score number uses `ink`.

Use semantic tokens in code (`bg-canvas`, `text-ink`, `text-muted`), never raw hex in components.

---

## 3. Typography

A deliberate pairing — not Inter-by-default. Numbers get a distinct, confident treatment.

- **Display / numerals:** **Sora** (geometric, modern; excellent tabular numerals). Used for the score, big metrics, screen titles. Weights 600/700. Enable tabular figures for all numbers so they don't jitter as they count up.
- **Body / UI:** **Plus Jakarta Sans** (warm, humanist, highly legible). Weights 400/500/600.
- **Data captions / units:** Plus Jakarta Sans 500, letter-spaced small caps feel via `tracking-wide`, uppercase for unit labels (KCAL, STEPS, L).

Load via `expo-font` / `@expo-google-fonts/sora` + `@expo-google-fonts/plus-jakarta-sans`.

**Type scale (pt):**

| Role | Size / Line / Weight | Family |
|------|----------------------|--------|
| Hero number (score) | 56 / 60 / 700 | Sora |
| Metric number | 28 / 32 / 600 | Sora |
| Title (screen) | 22 / 28 / 600 | Sora |
| Section header | 17 / 24 / 600 | Plus Jakarta |
| Body | 15 / 22 / 400 | Plus Jakarta |
| Label/secondary | 13 / 18 / 500 | Plus Jakarta |
| Unit caption | 11 / 14 / 600 (uppercase, tracked) | Plus Jakarta |

---

## 4. Spacing, radius, elevation

- **Spacing scale (px):** 4, 8, 12, 16, 20, 24, 32, 40. Default screen padding 20. Card padding 16–20.
- **Radius:** inputs/buttons 12; cards 20; sheets 24 (top); pills 999. Generous, soft — calm not boxy.
- **Elevation:** one soft shadow token for cards (`y:6, blur:20, color: ink @ 6–8%`); avoid heavy shadows. Dark theme uses border (`hairline`) instead of shadow.
- **Borders:** 1px `hairline` for inputs and dividers.

---

## 5. Components (build as a small kit)

`src/components/ui/` — keep primitives generic and themed by tokens:

- `Screen` (safe-area + canvas bg + scroll), `Card`, `Section`
- `Button` (variants: primary, secondary, ghost, destructive; sizes md/lg), `IconButton`
- `Stat` (number + unit + label; tabular), `Pill`/`Tag`
- `Input`, `Select`, `Stepper` (servings/quantity), `Slider` (1–10 scales), `Toggle`
- `BottomSheet` (log sheets), `ActionSheet` (the ⊕ menu)
- `ProgressRing` (the signature; §6), `TrendChart` (§7)
- `StreakFlame`, `BadgeChip`
- `EmptyState`, `LockedCard` (for Free→paywall), `Toast`

Feature components live under `src/features/<module>/components/`. UI kit stays presentational and reusable.

---

## 6. The Today Ring (signature spec)

- Built with **react-native-svg** (arcs via `Circle` + `strokeDasharray`) and animated with **react-native-reanimated** (animate `strokeDashoffset` on a worklet — smooth, off-JS-thread).
- 3–4 concentric arcs, ~12px stroke, rounded caps, `surface-sunken` track behind each.
- Center stack: score (Sora 56) + tiny "of 100" + one coaching line (Plus Jakarta 15, 2 lines max, truncates gracefully).
- On new log: target arc springs to new value + subtle scale pulse (150–250ms). `reduce-motion` → set value instantly.
- Tap target per arc opens its log sheet; whole-ring tap → today's breakdown.
- Accessible summary string (UI_UX_DESIGN §6).

Keep it the **only** elaborate visual. Everything else is flat, quiet cards.

---

## 7. Charts

- **react-native-gifted-charts** for trends (line for weight/score/sleep; bar for steps/water/protein).
- Themed: single-series uses `primary` or the metric's arc color; gridlines `hairline`; labels `ink-muted`; tabular numerals.
- Keep charts minimal — no 3D, no gradients-for-decoration. Range toggle as a segmented `Pill` group.
- Memoize series; downsample long ranges.

---

## 8. Iconography & imagery

- **lucide-react-native**, 1.75px stroke, sized 20/24. Consistent set only.
- Minimal illustration; if used, single-line style in `primary`/`ink-muted`. No stock photos. Food items can use simple emoji or category icons, not photos (except Advanced photo logs).

---

## 9. NativeWind config (token wiring)

Map tokens into `tailwind.config.js` so classes like `bg-canvas`, `text-ink`, `text-primary`, `rounded-card` exist. Drive light/dark via `dark:` variants bound to the color scheme. Example shape:

```js
// tailwind.config.js (excerpt)
theme: {
  extend: {
    colors: {
      canvas: '#F6F8F4', surface: '#FFFFFF', 'surface-sunken': '#EEF1EB',
      ink: '#14201B', 'ink-muted': '#5C6B63',
      primary: { DEFAULT: '#12A06A', press: '#0C8757' },
      energy: '#FF7A4D', cool: '#4C8DF5', warn: '#E0A82E', danger: '#D8503C',
      hairline: '#E2E7DD',
    },
    borderRadius: { md: '12px', card: '20px', sheet: '24px' },
    fontFamily: { display: ['Sora_600SemiBold'], body: ['PlusJakartaSans_400Regular'] },
  },
}
```

(Pair with a small theme hook for dark values, or define `dark`-prefixed tokens.)

---

## 10. Folder structure

```
src/
  app/                    # Expo Router routes (see APP_FLOW.md)
  components/ui/          # the design-system kit
  features/
    auth/  onboarding/  journal/  nutrition/  metrics/
    scoring/  ai/  reports/  subscriptions/  notifications/  family/
  lib/
    supabase.ts           # client
    revenuecat.ts
    queryClient.ts
    theme.ts              # tokens + light/dark + reduce-motion
  domain/                 # PURE, tested logic (no network, no LLM)
    metrics.ts            # bmi/bmr/tdee/targets
    scoring.ts            # deterministic daily score
    nutrition.ts          # macro summing
  hooks/                  # useDailyLog, useEntitlement, useTrends ...
  schemas/                # zod schemas (shared with edge fns)
  constants/              # enums, copy, reminder defaults
  assets/fonts/
```

`domain/` holds the deterministic math — it never imports UI or network. This is both the cost rule (TRD §4) and the testability rule (TRD §12).

---

## 11. Quality floor (non-negotiable)

- Responsive to small phones (≤360dp wide) and dynamic type.
- Light + dark both shipped.
- Visible focus, ≥44pt targets, reduced-motion respected.
- No layout-shift jitter on number updates (tabular figures + fixed-width containers).
- 60fps ring animation (worklet, not setState loops).
