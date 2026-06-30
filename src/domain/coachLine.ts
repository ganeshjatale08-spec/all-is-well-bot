// Deterministic, rule-based headline for the Today Ring center (HARD RULE 2:
// no LLM math, and this is the Free-tier line shown when no AI insight
// exists yet — UI_UX_DESIGN §3, §9).

export function deterministicHeadline(score: number, hasLoggedToday: boolean): string {
  if (!hasLoggedToday) return 'Start with a glass of water to get going.';
  if (score >= 90) return "Excellent day — you're right on target.";
  if (score >= 70) return 'Solid progress today, keep it up.';
  if (score >= 40) return 'Halfway there — a bit more logging fills the picture.';
  return "Every log helps — let's build today's picture.";
}
