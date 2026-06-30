// HARD RULE 6 / PRD §9 / TRD §5: "Safety post-check — after generation, run
// a lightweight server-side check for disallowed content (diagnosis/dosing/
// red-flag mishandling); if triggered, replace with a safe templated
// message + 'see a doctor.'" This is deliberately a coarse keyword screen,
// not a second LLM call — cheap, deterministic, and erring toward
// over-triggering (a generic-but-safe message is an acceptable fallback;
// a missed red flag is not).

export type AnalysisText = {
  headline: string;
  insight: string;
  recommendation: string;
  tomorrow_focus: string;
};

// Symptom text is free-form (BACKEND_SCHEMA §4 — symptom_entries.symptom has
// no enum). Severity is 1-10. "Red flag" = a symptom we should never let the
// model talk down, regardless of what it generated.
const RED_FLAG_SYMPTOM_KEYWORDS =
  /\b(chest pain|breathless|short(ness)? of breath|can'?t breathe|blood|bleeding|faint|fainted|seizure|suicid|self[- ]?harm|numbness|paraly)/i;
const RED_FLAG_SEVERITY_THRESHOLD = 8;

export function hasRedFlagSymptoms(
  symptoms: readonly { symptom: string; severity: number | null }[],
): boolean {
  return symptoms.some(
    (s) => RED_FLAG_SYMPTOM_KEYWORDS.test(s.symptom) || (s.severity ?? 0) >= RED_FLAG_SEVERITY_THRESHOLD,
  );
}

const DOSING_PATTERN = /\b\d+\s?(mg|mcg|ml|iu)\b|\b(tablet|capsule|pill|dosage|dose)s?\b/i;
const DIAGNOSIS_PATTERN =
  /\byou (have|may have|likely have|are suffering from|are diagnosed with)\b|\b(it'?s|it is) (likely|probably|definitely) (a |an )?\w+ (disease|infection|disorder|syndrome)\b/i;
const FALSE_REASSURANCE_PATTERN =
  /\b(nothing to worry|don'?t worry|it'?s not serious|you'?ll be fine|no need to see a doctor|not a big deal)\b/i;
const EXTREME_DEFICIT_PATTERN = /\b(skip meals?|stop eating|fast(ing)? for|starve|don'?t eat)\b/i;
const SEES_A_DOCTOR_PATTERN = /\bdoctor|physician|medical (professional|attention|advice)\b/i;

const SAFE_TEMPLATE: AnalysisText = {
  headline: 'Keep an eye on today',
  insight:
    "We noticed something in today's log that's worth a closer look. We're keeping this note general rather than guessing.",
  recommendation: 'Please check in with a doctor if anything feels off or isn\'t improving.',
  tomorrow_focus: 'Rest, hydrate, and monitor how you feel.',
};

const RED_FLAG_TEMPLATE: AnalysisText = {
  headline: 'Please see a doctor',
  insight:
    "Today's log includes something that's best assessed by a medical professional rather than an app.",
  recommendation: 'Please see a doctor soon, especially if the symptom is severe or persistent.',
  tomorrow_focus: 'Prioritize getting checked out; log how you feel for your own record.',
};

// Shared coarse screen for any other AI-generated health copy (weekly/
// monthly report narratives, goal rationale) that isn't shaped like daily's
// AnalysisText. Callers own their own safe fallback shape since reports and
// goals have different JSON structures than the daily analysis.
export function hasUnsafeContent(combinedText: string): boolean {
  return (
    DOSING_PATTERN.test(combinedText) ||
    DIAGNOSIS_PATTERN.test(combinedText) ||
    FALSE_REASSURANCE_PATTERN.test(combinedText) ||
    EXTREME_DEFICIT_PATTERN.test(combinedText)
  );
}

export function runSafetyPostCheck(text: AnalysisText, hasRedFlag: boolean): AnalysisText {
  const combined = `${text.headline} ${text.insight} ${text.recommendation} ${text.tomorrow_focus}`;

  if (hasRedFlag && !SEES_A_DOCTOR_PATTERN.test(combined)) {
    return RED_FLAG_TEMPLATE;
  }
  if (hasRedFlag && FALSE_REASSURANCE_PATTERN.test(combined)) {
    return RED_FLAG_TEMPLATE;
  }
  if (
    DOSING_PATTERN.test(combined) ||
    DIAGNOSIS_PATTERN.test(combined) ||
    FALSE_REASSURANCE_PATTERN.test(combined) ||
    EXTREME_DEFICIT_PATTERN.test(combined)
  ) {
    return SAFE_TEMPLATE;
  }

  return text;
}
