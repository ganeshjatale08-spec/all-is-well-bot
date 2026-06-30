// Shared Gemini client (HARD RULE 1: only ever instantiated inside an Edge
// Function, key from server env). TRD §4.2/§4.3/§5: model tiering, tight
// token budgets, structured JSON output via responseSchema.
import { GoogleGenAI, Type } from 'npm:@google/genai@^1.0.0';

const apiKey = Deno.env.get('GEMINI_API_KEY');
if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

const ai = new GoogleGenAI({ apiKey });

export const DAILY_ANALYSIS_MODEL = 'gemini-2.5-flash-lite';

export type DailyAnalysisResult = {
  headline: string;
  insight: string;
  recommendation: string;
  tomorrow_focus: string;
  inputTokens: number;
  outputTokens: number;
};

// health_score is deliberately absent from this schema (HARD RULE 2): the
// LLM only narrates, the score is set server-side from the recomputed
// deterministic breakdown.
const DAILY_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: 'Short, under 8 words.' },
    insight: { type: Type.STRING, description: '2-3 supportive sentences.' },
    recommendation: { type: Type.STRING, description: 'One concrete, doable action.' },
    tomorrow_focus: { type: Type.STRING, description: 'One line.' },
  },
  required: ['headline', 'insight', 'recommendation', 'tomorrow_focus'],
};

const MAX_OUTPUT_TOKENS = 400;

// systemInstruction is the same static text + profile block for every call
// for a given user across the month (TRD §4.3: "cache the system prompt +
// profile block; reuse across the month"). Gemini 2.5 models apply implicit
// caching to repeated prefixes automatically, so keeping this argument
// byte-for-byte stable across calls (rather than re-deriving wording) is
// what earns the cached-token discount — no explicit cache management API
// is needed for this to take effect.
export async function generateDailyAnalysis(
  systemInstruction: string,
  userPrompt: string,
): Promise<DailyAnalysisResult> {
  const response = await ai.models.generateContent({
    model: DAILY_ANALYSIS_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: DAILY_ANALYSIS_SCHEMA,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned no text');

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const headline = typeof parsed.headline === 'string' ? parsed.headline : '';
  const insight = typeof parsed.insight === 'string' ? parsed.insight : '';
  const recommendation = typeof parsed.recommendation === 'string' ? parsed.recommendation : '';
  const tomorrow_focus = typeof parsed.tomorrow_focus === 'string' ? parsed.tomorrow_focus : '';

  if (!headline || !insight || !recommendation || !tomorrow_focus) {
    throw new Error('Gemini response missing required fields');
  }

  return {
    headline,
    insight,
    recommendation,
    tomorrow_focus,
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ---- weekly-report (TRD §4.3: weekly tiers to Flash-Lite, same as daily) ----

export const WEEKLY_REPORT_MODEL = 'gemini-2.5-flash-lite';

export type WeeklyReportResult = {
  narrative: string;
  achievements: string[];
  improvement_areas: string[];
  inputTokens: number;
  outputTokens: number;
};

const WEEKLY_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING, description: '2-3 supportive sentences.' },
    achievements: { type: Type.ARRAY, items: { type: Type.STRING }, description: '1-3 short strings.' },
    improvement_areas: { type: Type.ARRAY, items: { type: Type.STRING }, description: '0-2 short strings.' },
  },
  required: ['narrative', 'achievements', 'improvement_areas'],
};

export async function generateWeeklyReport(systemInstruction: string, userPrompt: string): Promise<WeeklyReportResult> {
  const response = await ai.models.generateContent({
    model: WEEKLY_REPORT_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: WEEKLY_REPORT_SCHEMA,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned no text');

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const narrative = typeof parsed.narrative === 'string' ? parsed.narrative : '';
  const achievements = Array.isArray(parsed.achievements) ? parsed.achievements.filter((v): v is string => typeof v === 'string') : [];
  const improvement_areas = Array.isArray(parsed.improvement_areas)
    ? parsed.improvement_areas.filter((v): v is string => typeof v === 'string')
    : [];

  if (!narrative) throw new Error('Gemini response missing required fields');

  return {
    narrative,
    achievements,
    improvement_areas,
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ---- monthly-report (TRD §4.3: monthly tiers to 2.5 Flash, deeper analysis) ----

export const MONTHLY_REPORT_MODEL = 'gemini-2.5-flash';

export type MonthlyReportResult = {
  narrative: string;
  insights: string[];
  inputTokens: number;
  outputTokens: number;
};

const MONTHLY_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING, description: '2-4 supportive sentences.' },
    insights: { type: Type.ARRAY, items: { type: Type.STRING }, description: '1-3 short strings.' },
  },
  required: ['narrative', 'insights'],
};

export async function generateMonthlyReport(systemInstruction: string, userPrompt: string): Promise<MonthlyReportResult> {
  const response = await ai.models.generateContent({
    model: MONTHLY_REPORT_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: MONTHLY_REPORT_SCHEMA,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned no text');

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const narrative = typeof parsed.narrative === 'string' ? parsed.narrative : '';
  const insights = Array.isArray(parsed.insights) ? parsed.insights.filter((v): v is string => typeof v === 'string') : [];

  if (!narrative) throw new Error('Gemini response missing required fields');

  return {
    narrative,
    insights,
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ---- goal-generator (TRD §4.3: tiers to 2.5 Flash alongside monthly) ----

export const GOAL_GENERATOR_MODEL = 'gemini-2.5-flash';

export type GoalRationaleResult = {
  rationale: Record<string, string>;
  sugar_reduction_note: string;
  inputTokens: number;
  outputTokens: number;
};

const GOAL_GENERATOR_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rationale: {
      type: Type.OBJECT,
      properties: {
        target_weight: { type: Type.STRING },
        daily_steps: { type: Type.STRING },
        sleep: { type: Type.STRING },
        water: { type: Type.STRING },
        protein: { type: Type.STRING },
        workouts: { type: Type.STRING },
      },
    },
    sugar_reduction_note: { type: Type.STRING, description: 'One short, practical line.' },
  },
  required: ['rationale', 'sugar_reduction_note'],
};

export async function generateGoalRationale(systemInstruction: string, userPrompt: string): Promise<GoalRationaleResult> {
  const response = await ai.models.generateContent({
    model: GOAL_GENERATOR_MODEL,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: GOAL_GENERATOR_SCHEMA,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.6,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Gemini returned no text');

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const rationaleRaw = parsed.rationale && typeof parsed.rationale === 'object' ? (parsed.rationale as Record<string, unknown>) : {};
  const rationale: Record<string, string> = {};
  for (const [key, value] of Object.entries(rationaleRaw)) {
    if (typeof value === 'string') rationale[key] = value;
  }
  const sugar_reduction_note = typeof parsed.sugar_reduction_note === 'string' ? parsed.sugar_reduction_note : '';

  if (Object.keys(rationale).length === 0 || !sugar_reduction_note) {
    throw new Error('Gemini response missing required fields');
  }

  return {
    rationale,
    sugar_reduction_note,
    inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
  };
}
