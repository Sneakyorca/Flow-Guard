-- Product improvements (see docs/research/product.md):
--   * per-step JPEG timeline in the replays bucket
--   * flakiness detection: a failed run is retried once before alerting

update storage.buckets
   set allowed_mime_types = array['video/webm', 'application/json', 'image/png', 'image/jpeg']
 where id = 'replays';

alter table public.flow_runs
  add column if not exists attempts integer not null default 1,
  add column if not exists flaky boolean not null default false,
  add column if not exists explanation jsonb;

-- Expose the new fields to public replay pages.
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
  where r.public_share_token = token
    and length(token) >= 32
  limit 1;
$$;
