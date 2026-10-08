-- Stops anyone creating discussions or comments through the database, not just through the app. Safe to re-run.
-- Existing posts and comments are NOT deleted. News polls still work: they are stored as posts created by the
-- daily job (service role), and poll votes are separate.
revoke execute on function public.create_post(text, text[], text, text, text, text, boolean, text[], text, text) from authenticated;
revoke insert on public.comments from authenticated;
drop policy if exists "own insert" on public.comments;
