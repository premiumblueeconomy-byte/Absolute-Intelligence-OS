import { runSwarm } from './swarm.ts';
import { CORE_SYSTEM_PROMPT } from './prompt.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Use POST' }, 405);
  const requestId = crypto.randomUUID();
  let reservation: string | null = null;
  let succeeded = false;
  try {
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Please sign in to generate opportunities.' }, 401);
    const auth = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
      signal: AbortSignal.timeout(10000),
    });
    if (!auth.ok || !(await auth.json())?.id) return reply({ error: 'Your session expired. Please sign in again.' }, 401);
    const raw = await req.text();
    if (raw.length > 60000) return reply({ error: 'The request is too large.' }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return reply({ error: 'Invalid JSON request.' }, 400); }
    if (typeof body?.input !== 'string' || !body.input.trim() || body.input.length > 20000) return reply({ error: 'Enter a request under 20,000 characters.' }, 400);
    if (body.agents !== undefined && (!Array.isArray(body.agents) || body.agents.length > 20 || body.agents.some((a: unknown) => typeof a !== 'string' || a.length > 100))) return reply({ error: 'Invalid workflow selection.' }, 400);
    const key = Deno.env.get('DEEPSEEK_API_KEY');
    if (!key) return reply({ error: 'AI generation is not configured. Add the DeepSeek API key in Supabase function secrets.' }, 503);
    const reserved = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/reserve_generation`, {
      method: 'POST', headers: { Authorization: authorization, apikey: Deno.env.get('SUPABASE_ANON_KEY')!, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000),
    });
    if (!reserved.ok) {
      const failure = await reserved.json();
      const known = ['Your account is not active.', 'Generation is temporarily paused. Please try again later.', 'Monthly generation limit reached. Review your plan on the Billing page.'];
      const message = known.includes(failure.message) ? failure.message : 'Unable to check generation access. Please try again.';
      return reply({error: message}, failure.code === '42501' ? 403 : message.includes('limit') ? 429 : 503);
    }
    reservation = await reserved.json();
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 130000);
    try {
      const result = await runSwarm(JSON.stringify({ mode: body.mode ?? 'discover', input: body.input, requested_lenses: body.agents ?? [], context: body.context ?? {} }), CORE_SYSTEM_PROMPT,
        async (role, system, input, maxTokens) => {
          console.info(JSON.stringify({ requestId, stage: role, status: 'started' }));
          const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(role === 'integrator' ? 55000 : 35000)]),
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: Deno.env.get('AIOS_MODEL') || 'deepseek-chat', max_tokens: maxTokens, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: input }] }),
          });
          if (!response.ok) {
            console.error(JSON.stringify({ requestId, stage: role, status: response.status }));
            throw new Error(response.status === 402 ? 'AI provider balance is insufficient. Please top up the DeepSeek account.' : response.status === 429 ? 'AI generation is busy. Please try again shortly.' : 'The AI provider could not complete the analysis. Please try again.');
          }
          const output = await response.json();
          const choice = output?.choices?.[0];
          if (choice?.finish_reason === 'length') throw new Error('The analysis was too long. Please narrow your request and try again.');
          const text = choice?.message?.content;
          if (typeof text !== 'string' || !text.trim()) throw new Error('The AI returned an empty response. Please retry.');
          const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
          console.info(JSON.stringify({ requestId, stage: role, status: 'completed' }));
          return parsed;
        });
      if (body.mode === 'discover' && result.opportunities.length === 0) return reply({ error: 'No viable opportunities were found. Add more detail and try again.' }, 422);
      succeeded = true;
      return reply({ agents: result.swarm.agents, mode: body.mode ?? 'discover', result });
    } finally { clearTimeout(deadline); controller.abort(); }
  } catch (error) {
    const timeout = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
    const invalid = error instanceof Error && ['ZodError', 'SyntaxError'].includes(error.name);
    const message = timeout ? 'The swarm analysis timed out. Try a narrower prompt.' : invalid ? 'An agent returned an incomplete analysis. Please retry.' : error instanceof Error ? error.message : 'Generation failed. Please try again.';
    console.error(JSON.stringify({ requestId, error: message }));
    return reply({ error: message, requestId }, timeout ? 504 : 502);
  } finally {
    if (reservation) {
      try {
        const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const done = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/finish_generation`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({p_id: reservation, p_success: succeeded}), signal: AbortSignal.timeout(10000) });
        if (!done.ok) console.error(JSON.stringify({requestId, error:'Usage finalization failed'}));
      } catch { console.error(JSON.stringify({requestId, error:'Usage finalization unavailable'})); }
    }
  }
});
