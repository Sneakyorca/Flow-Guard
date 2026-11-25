-- Workspace alert settings saved from /alerts, and an off switch for public replay links.
-- Run once in the Supabase SQL editor (safe to re-run).

alter table public.workspaces
  add column if not exists alert_email boolean not null default true,    -- email the owner on a confirmed failure
  add column if not exists public_replays boolean not null default true; -- anyone with a replay link can open it

-- Replay links: public while the workspace allows it; otherwise only the signed-in owner
-- can open them (auth.uid() is null for anonymous visitors).
create or replace function public.get_public_run(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'started_at', r.started_at,
    'duration_ms', r.duration_ms,
    'failed_step_index', r.failed_step_index,
    'error_message', r.error_message,
    'video_path', r.video_url,
    'console_logs', r.console_logs_json,
    'network_errors', r.network_errors_json,
    'steps', r.steps_result_json,
    'attempts', r.attempts,
    'flaky', r.flaky,
    'explanation', r.explanation,
    'flow', jsonb_build_object(
      'name', f.name,
      'start_url', f.start_url,
      'viewport', f.viewport,
      'steps', f.steps_json
    )
  )
  from public.flow_runs r
  join public.flows f on f.id = r.flow_id
  join public.workspaces w on w.id = f.workspace_id
  where r.public_share_token = token
    and length(token) >= 32
    and (w.public_replays or w.owner_id = (select auth.uid()))
  limit 1;
$$;

revoke all on function public.get_public_run(text) from public;
grant execute on function public.get_public_run(text) to anon, authenticated;
