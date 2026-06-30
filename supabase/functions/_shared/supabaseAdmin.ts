// Service-role Supabase client (HARD RULE 4: Edge Functions use service
// role and must enforce ownership/entitlement in code, since RLS no longer
// gates a service-role connection). SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are auto-injected into every Edge Function's
// env by the platform (TRD §11) — not user-configured secrets.
import { createClient, type User } from 'npm:@supabase/supabase-js@2';

export function createServiceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

// Validates the caller's JWT (passed through from the client's Supabase
// session) against the service-role client rather than trusting any
// user_id the request body might claim.
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const client = createServiceClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// The overnight pg_cron batch (see the cron migration) calls this function
// once per qualifying user authenticated as the service role itself, not as
// any individual user's JWT — there is no per-user session to forward from
// a SQL cron job. In that mode (and only that mode) the request is allowed
// to specify user_id explicitly in the body; holding the service role key
// already implies full database access, so this isn't a weaker trust
// boundary than what that key already grants (HARD RULE 4).
export function isServiceRoleRequest(req: Request): boolean {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice('Bearer '.length);
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return !!serviceKey && token === serviceKey;
}
