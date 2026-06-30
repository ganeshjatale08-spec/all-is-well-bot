// Standard permissive CORS for client-invoked Edge Functions (the app calls
// these directly with the user's JWT — see supabaseAdmin.ts for the
// auth-from-header pattern).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
