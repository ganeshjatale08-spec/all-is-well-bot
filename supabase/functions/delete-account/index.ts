// delete-account — hard-deletes the authenticated user's account.
// All child rows cascade (FK: on delete cascade on every user-owned table).
// Called from the client with the user's own JWT; never from cron.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`delete-account error for ${user.id}: ${error.message}`);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ deleted: true }, 200);
});
