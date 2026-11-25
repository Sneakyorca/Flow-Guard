-- Indexes for the free public scan's rate limits (one scan per IP every few minutes,
-- reuse of a recent scan of the same URL, and an hourly cap). Safe to re-run.
create index if not exists public_scans_ip_idx  on public.public_scans (requester_ip_hash, created_at desc);
create index if not exists public_scans_url_idx on public.public_scans (url, created_at desc);
