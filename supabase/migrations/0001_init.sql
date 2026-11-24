-- FlowGuard initial schema.
-- Run in the Supabase SQL editor (free tier) or with `supabase db push`.
--
-- Tables (per docs/PLAN.md):
--   workspaces  (id, owner_id, plan, slack_webhook_url)
--   flows       (id, workspace_id, name, start_url, viewport, schedule_cron, status, steps_json)
--   flow_runs   (id, flow_id, status, started_at, duration_ms, failed_step_index, error_message,
--                video_url, console_logs_json, network_errors_json, public_share_token)
--   public_scans (free scanner reports)
-- Additive bookkeeping columns (name, created_at, last_run_at, steps_result_json) are marked "extra".

create extension if not exists pgcrypto with schema extensions;

-- Random URL-safe share token (32 hex chars from two v4 UUIDs ~ 244 random bits).
create or replace function public.fg_new_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id) on delete cascade,
  plan              text not null default 'free' check (plan in ('free', 'pro', 'team')),
  slack_webhook_url text,
  name              text not null default 'My Workspace',           -- extra
  created_at        timestamptz not null default now()               -- extra
);
create index workspaces_owner_idx on public.workspaces (owner_id);

-- ---------------------------------------------------------------------------
-- flows
-- ---------------------------------------------------------------------------
create table public.flows (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null,
  start_url     text not null,
  viewport      text not null default 'desktop' check (viewport in ('desktop', 'mobile')),
  schedule_cron text default '0 * * * *',   -- null = webhook/manual only
  status        text not null default 'active' check (status in ('active', 'paused')),
  steps_json    jsonb not null default '[]'::jsonb,  -- [{ "instruction": "Click Sign up" }, ...]
  last_run_at   timestamptz,                                       -- extra: used by the scheduler
  created_at    timestamptz not null default now()                 -- extra
);
create index flows_workspace_idx on public.flows (workspace_id);
create index flows_due_idx on public.flows (status, last_run_at);

-- ---------------------------------------------------------------------------
-- flow_runs
-- ---------------------------------------------------------------------------
create table public.flow_runs (
  id                  uuid primary key default gen_random_uuid(),
  flow_id             uuid not null references public.flows (id) on delete cascade,
  status              text not null check (status in ('PASSING', 'FAILED')),
  started_at          timestamptz not null default now(),
  duration_ms         integer,
  failed_step_index   integer,
  error_message       text,
  video_url           text,          -- storage path inside the private `replays` bucket
  console_logs_json   jsonb not null default '[]'::jsonb,
  network_errors_json jsonb not null default '[]'::jsonb,
  public_share_token  text not null unique default public.fg_new_token(),
  steps_result_json   jsonb not null default '[]'::jsonb             -- extra: per-step durations + reasoning
);
create index flow_runs_flow_idx on public.flow_runs (flow_id, started_at desc);

-- ---------------------------------------------------------------------------
-- public_scans (free instant scanner; written by the worker with the service key)
-- ---------------------------------------------------------------------------
create table public.public_scans (
  id           uuid primary key default gen_random_uuid(),
  url          text not null,
  status       text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  score        integer,
  report_json  jsonb,
  video_url    text,
  share_token  text not null unique default public.fg_new_token(),
  requester_ip_hash text,   -- for rate limiting, never the raw IP
  created_at   timestamptz not null default now()
);
create index public_scans_created_idx on public.public_scans (created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security: users only see rows for workspaces they own.
-- The worker uses the service role key, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.workspaces   enable row level security;
alter table public.flows        enable row level security;
alter table public.flow_runs    enable row level security;
alter table public.public_scans enable row level security;

create policy "workspaces: owner select" on public.workspaces
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "workspaces: owner update" on public.workspaces
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "workspaces: owner insert" on public.workspaces
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "workspaces: owner delete" on public.workspaces
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "flows: owner all" on public.flows
  for all to authenticated
  using (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())))
  with check (workspace_id in (select id from public.workspaces where owner_id = (select auth.uid())));

create policy "flow_runs: owner select" on public.flow_runs
  for select to authenticated
  using (flow_id in (
    select f.id from public.flows f
    join public.workspaces w on w.id = f.workspace_id
    where w.owner_id = (select auth.uid())
  ));
-- No insert/update policy for flow_runs: only the worker (service role) writes runs.
-- No policies on public_scans: reads go through get_public_scan(), writes via service role.

-- ---------------------------------------------------------------------------
-- Create a workspace automatically for every new auth user.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspaces (owner_id, name)
  values (
    new.id,
    coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'My') || '''s Workspace'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Public, read-only replay lookup keyed on the share token.
-- Exposes only what /replay/[token] needs: no workspace, owner or webhook data.
-- ---------------------------------------------------------------------------
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

revoke all on function public.get_public_run(text) from public;
grant execute on function public.get_public_run(text) to anon, authenticated;

create or replace function public.get_public_scan(token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id, 'url', s.url, 'status', s.status, 'score', s.score,
    'report', s.report_json, 'video_path', s.video_url, 'created_at', s.created_at
  )
  from public.public_scans s
  where s.share_token = token and length(token) >= 32
  limit 1;
$$;

revoke all on function public.get_public_scan(text) from public;
grant execute on function public.get_public_scan(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private `replays` bucket.
-- Object path convention: <workspace_id>/<run_id>/video.webm (+ diagnostics.json, failure.png)
-- Scans: scans/<scan_id>/video.webm (service role only; served via signed URLs).
-- Owners can read their workspace folder; uploads come from the worker (service role).
-- Public replay pages get short-lived signed URLs generated server-side after get_public_run().
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('replays', 'replays', false, 52428800,
        array['video/webm', 'application/json', 'image/png'])
on conflict (id) do nothing;

create policy "replays: owner read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'replays'
    and (storage.foldername(name))[1] in (
      select id::text from public.workspaces where owner_id = (select auth.uid())
    )
  );

create policy "replays: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'replays'
    and (storage.foldername(name))[1] in (
      select id::text from public.workspaces where owner_id = (select auth.uid())
    )
  );
