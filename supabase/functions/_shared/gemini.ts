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
