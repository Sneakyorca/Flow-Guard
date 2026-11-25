-- Supabase security advisor (lint 0028/0029): handle_new_user() is a SECURITY DEFINER trigger
-- function, so it should not be callable through the REST API (/rest/v1/rpc/handle_new_user).
-- The auth.users trigger still runs it; only direct calls are removed.
-- get_public_run / get_public_scan stay executable by anon on purpose: they power public
-- share links and only return the one row matching a 64-char random token.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
