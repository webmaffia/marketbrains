-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.uid() returns text
language sql stable as $$ select auth.uid()::text $$;

-- ============================================================
-- New auth user -> profile
-- ============================================================

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base_name text;
  handle    text;
  candidate text;
  n         int := 0;
begin
  base_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1));
  handle := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9._]', '', 'g'));
  if handle = '' then handle := 'member'; end if;
  candidate := handle;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := handle || n::text;
  end loop;

  insert into public.profiles (id, username, name, hue)
  values (new.id::text, candidate, left(base_name, 60), (abs(hashtext(new.id::text)) % 360));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Counters + notifications
-- ============================================================

create or replace function public.notify(p_user text, p_actor text, p_type text, p_text text, p_href text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  insert into public.notifications (user_id, actor_id, type, text, href) values (p_user, p_actor, p_type, p_text, p_href);
end $$;

create or replace function public.on_post_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.posts;
begin
  if tg_op = 'INSERT' then
    update public.posts set likes = likes + 1 where id = new.post_id returning * into p;
    perform public.notify(p.author_id, new.user_id, 'like', 'liked your post', '/community/' || p.community_slug || '/post/' || p.id);
    return new;
  else
    update public.posts set likes = greatest(likes - 1, 0) where id = old.post_id;
    return old;
  end if;
end $$;
drop trigger if exists trg_post_like on public.post_likes;
create trigger trg_post_like after insert or delete on public.post_likes for each row execute function public.on_post_like();

create or replace function public.on_comment_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.comments; p public.posts;
begin
  if tg_op = 'INSERT' then
    update public.comments set likes = likes + 1 where id = new.comment_id returning * into c;
    select * into p from public.posts where id = c.post_id;
    perform public.notify(c.author_id, new.user_id, 'like', 'liked your comment', '/community/' || p.community_slug || '/post/' || p.id);
    return new;
  else
    update public.comments set likes = greatest(likes - 1, 0) where id = old.comment_id;
    return old;
  end if;
end $$;
drop trigger if exists trg_comment_like on public.comment_likes;
create trigger trg_comment_like after insert or delete on public.comment_likes for each row execute function public.on_comment_like();

create or replace function public.on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.posts; parent public.comments;
begin
  if tg_op = 'INSERT' then
    update public.posts set comments = comments + 1 where id = new.post_id returning * into p;
    update public.profiles set comments = comments + 1 where id = new.author_id;
    if new.parent_id is not null then
      select * into parent from public.comments where id = new.parent_id;
      perform public.notify(parent.author_id, new.author_id, 'reply', 'replied to your comment', '/community/' || p.community_slug || '/post/' || p.id);
    end if;
    if new.parent_id is null or parent.author_id is distinct from p.author_id then
      perform public.notify(p.author_id, new.author_id, 'comment', 'commented on your discussion', '/community/' || p.community_slug || '/post/' || p.id);
    end if;
    return new;
  else
    update public.posts set comments = greatest(comments - 1, 0) where id = old.post_id;
    update public.profiles set comments = greatest(comments - 1, 0) where id = old.author_id;
    return old;
  end if;
end $$;
drop trigger if exists trg_comment on public.comments;
create trigger trg_comment after insert or delete on public.comments for each row execute function public.on_comment();

create or replace function public.on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  if tg_op = 'INSERT' then
    update public.profiles set followers = followers + 1 where id = new.followee_id;
    update public.profiles set following = following + 1 where id = new.follower_id;
    select username into uname from public.profiles where id = new.follower_id;
    perform public.notify(new.followee_id, new.follower_id, 'follow', 'started following you', '/user/' || uname);
    return new;
  else
    update public.profiles set followers = greatest(followers - 1, 0) where id = old.followee_id;
    update public.profiles set following = greatest(following - 1, 0) where id = old.follower_id;
    return old;
  end if;
end $$;
drop trigger if exists trg_follow on public.follows;
create trigger trg_follow after insert or delete on public.follows for each row execute function public.on_follow();

create or replace function public.on_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set members = members + 1 where slug = new.community_slug;
    return new;
  else
    update public.communities set members = greatest(members - 1, 0) where slug = old.community_slug;
    return old;
  end if;
end $$;
drop trigger if exists trg_membership on public.community_members;
create trigger trg_membership after insert or delete on public.community_members for each row execute function public.on_membership();

create or replace function public.on_post() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.communities set discussions = discussions + 1 where slug = new.community_slug;
    update public.profiles set discussions = discussions + 1 where id = new.author_id;
    if new.news_id is not null then
      update public.news set discussion_count = discussion_count + 1 where id = new.news_id;
    end if;
    return new;
  else
    update public.communities set discussions = greatest(discussions - 1, 0) where slug = old.community_slug;
    update public.profiles set discussions = greatest(discussions - 1, 0) where id = old.author_id;
    if old.news_id is not null then
      update public.news set discussion_count = greatest(discussion_count - 1, 0) where id = old.news_id;
    end if;
    return old;
  end if;
end $$;
drop trigger if exists trg_post on public.posts;
create trigger trg_post after insert or delete on public.posts for each row execute function public.on_post();

create or replace function public.on_poll_vote() returns trigger
language plpgsql security definer set search_path = public as $$
declare ends timestamptz;
begin
  select ends_at into ends from public.polls where post_id = new.post_id;
  if ends is not null and ends < now() then
    raise exception 'This poll has ended';
  end if;
  update public.poll_options set votes = votes + 1 where post_id = new.post_id and id = new.option_id;
  return new;
end $$;
drop trigger if exists trg_poll_vote on public.poll_votes;
create trigger trg_poll_vote before insert on public.poll_votes for each row execute function public.on_poll_vote();

-- ============================================================
-- RPCs
-- ============================================================

-- Pro members start discussions. Creates the post (and poll) atomically.
drop function if exists public.create_post(text, text[], text, text, text, text, boolean, text[]);
create or replace function public.create_post(
  p_community text,
  p_topics text[],
  p_type text,
  p_stance text,
  p_title text,
  p_body text,
  p_has_image boolean default false,
  p_poll_options text[] default null,
  p_news_id text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  me        text := auth.uid()::text;
  new_id    text;
  opts      text[];
  i         int;
  m         text;
  target    public.profiles;
  community text := p_community;
  kind      text := coalesce(p_type, 'discussion');
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = me and plan = 'pro') then
    raise exception 'Starting discussions requires a Pro membership';
  end if;

  -- A reaction to a news item always lives in that item's community.
  if p_news_id is not null then
    select community_slug into community from public.news where id = p_news_id;
    if community is null then raise exception 'Unknown news item'; end if;
    kind := 'news';
  end if;

  if not exists (select 1 from public.communities where slug = community) then
    raise exception 'Unknown community';
  end if;

  opts := array(select trim(o) from unnest(coalesce(p_poll_options, '{}')) o where trim(o) <> '');
  if p_poll_options is not null and (array_length(opts, 1) is null or array_length(opts, 1) < 2 or array_length(opts, 1) > 4) then
    raise exception 'A poll needs 2 to 4 options';
  end if;

  insert into public.posts (author_id, community_slug, topics, type, stance, title, body, has_image, news_id)
  values (me, community, (coalesce(p_topics, '{}'))[1:3], case when p_poll_options is not null then 'poll' else kind end,
          p_stance, trim(p_title), trim(coalesce(p_body, '')), coalesce(p_has_image, false), p_news_id)
  returning id into new_id;

  if p_poll_options is not null then
    insert into public.polls (post_id, question, ends_at) values (new_id, trim(p_title), now() + interval '24 hours');
    for i in 1 .. array_length(opts, 1) loop
      insert into public.poll_options (post_id, id, label, position) values (new_id, 'o' || i, opts[i], i);
    end loop;
  end if;

  -- @mentions
  for m in select distinct lower((regexp_matches(coalesce(p_body, ''), '@([a-zA-Z0-9._]+)', 'g'))[1]) loop
    select * into target from public.profiles where username = m;
    if found then
      perform public.notify(target.id, me, 'mention', 'mentioned you in a discussion', '/community/' || community || '/post/' || new_id);
    end if;
  end loop;

  return new_id;
end $$;

-- Admin-only news management. Set profiles.is_admin = true in the dashboard to make someone an admin.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()::text), false)
$$;

create or replace function public.add_news(p_community text, p_source text, p_headline text, p_url text default null) returns text
language plpgsql security definer set search_path = public as $$
declare new_id text := gen_random_uuid()::text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.communities where slug = p_community) then raise exception 'Unknown community'; end if;
  if char_length(trim(coalesce(p_headline, ''))) < 8 then raise exception 'Headline is too short'; end if;
  if nullif(trim(coalesce(p_url, '')), '') is not null and trim(p_url) !~* '^https?://' then raise exception 'Link must start with http:// or https://'; end if;
  insert into public.news (id, community_slug, source, headline, url)
  values (new_id, p_community, left(trim(coalesce(nullif(trim(p_source), ''), 'MarketBrains')), 60), left(trim(p_headline), 200), nullif(trim(coalesce(p_url, '')), ''));
  return new_id;
end $$;

create or replace function public.delete_news(p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.news where id = p_id;
end $$;

-- Demo upgrade: there is no payment provider wired up yet. Replace the body with a
-- webhook-driven update (service role) before charging real money.
create or replace function public.upgrade_to_pro() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update public.profiles set plan = 'pro' where id = auth.uid()::text;
end $$;

-- ============================================================
-- Row level security
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.assets            enable row level security;
alter table public.topics            enable row level security;
alter table public.communities       enable row level security;
alter table public.community_members enable row level security;
alter table public.posts             enable row level security;
alter table public.polls             enable row level security;
alter table public.poll_options      enable row level security;
alter table public.poll_votes        enable row level security;
alter table public.comments          enable row level security;
alter table public.post_likes        enable row level security;
alter table public.comment_likes     enable row level security;
alter table public.saves             enable row level security;
alter table public.follows           enable row level security;
alter table public.news              enable row level security;
alter table public.notifications     enable row level security;

-- Public read
do $$
declare t text;
begin
  foreach t in array array['profiles','assets','topics','communities','community_members','posts','polls','poll_options','comments','news','follows']
  loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select using (true)', t);
  end loop;
end $$;

-- Own rows only
drop policy if exists "own read"   on public.poll_votes;
drop policy if exists "own insert" on public.poll_votes;
create policy "own read"   on public.poll_votes for select using (user_id = public.uid());
create policy "own insert" on public.poll_votes for insert with check (user_id = public.uid());

drop policy if exists "own read"   on public.post_likes;
drop policy if exists "own insert" on public.post_likes;
drop policy if exists "own delete" on public.post_likes;
create policy "own read"   on public.post_likes for select using (user_id = public.uid());
create policy "own insert" on public.post_likes for insert with check (user_id = public.uid());
create policy "own delete" on public.post_likes for delete using (user_id = public.uid());

drop policy if exists "own read"   on public.comment_likes;
drop policy if exists "own insert" on public.comment_likes;
drop policy if exists "own delete" on public.comment_likes;
create policy "own read"   on public.comment_likes for select using (user_id = public.uid());
create policy "own insert" on public.comment_likes for insert with check (user_id = public.uid());
create policy "own delete" on public.comment_likes for delete using (user_id = public.uid());

drop policy if exists "own read"   on public.saves;
drop policy if exists "own insert" on public.saves;
drop policy if exists "own delete" on public.saves;
create policy "own read"   on public.saves for select using (user_id = public.uid());
create policy "own insert" on public.saves for insert with check (user_id = public.uid());
create policy "own delete" on public.saves for delete using (user_id = public.uid());

drop policy if exists "own insert" on public.follows;
drop policy if exists "own delete" on public.follows;
create policy "own insert" on public.follows for insert with check (follower_id = public.uid());
create policy "own delete" on public.follows for delete using (follower_id = public.uid());

drop policy if exists "own insert" on public.community_members;
drop policy if exists "own delete" on public.community_members;
create policy "own insert" on public.community_members for insert with check (user_id = public.uid());
create policy "own delete" on public.community_members for delete using (user_id = public.uid());

drop policy if exists "own insert" on public.comments;
drop policy if exists "own delete" on public.comments;
create policy "own insert" on public.comments for insert with check (author_id = public.uid());
create policy "own delete" on public.comments for delete using (author_id = public.uid());

drop policy if exists "own delete" on public.posts;
create policy "own delete" on public.posts for delete using (author_id = public.uid());

drop policy if exists "own read"   on public.notifications;
drop policy if exists "own update" on public.notifications;
create policy "own read"   on public.notifications for select using (user_id = public.uid());
create policy "own update" on public.notifications for update using (user_id = public.uid()) with check (user_id = public.uid());

drop policy if exists "own update" on public.profiles;
create policy "own update" on public.profiles for update using (id = public.uid()) with check (id = public.uid());

-- Column-level privileges: clients can never write counters, plan or notification content.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;

grant update (name, bio, avatar_url)               on public.profiles to authenticated;
grant insert, delete                               on public.post_likes, public.comment_likes, public.saves, public.follows, public.community_members to authenticated;
grant insert (post_id, option_id, user_id)         on public.poll_votes to authenticated;
grant insert (post_id, author_id, parent_id, body) on public.comments to authenticated;
grant delete                                       on public.comments, public.posts to authenticated;
grant update (read)                                on public.notifications to authenticated;

grant execute on function public.create_post(text, text[], text, text, text, text, boolean, text[], text) to authenticated;
grant execute on function public.add_news(text, text, text, text) to authenticated;
grant execute on function public.delete_news(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.upgrade_to_pro() to authenticated;
revoke execute on function public.notify(text, text, text, text, text) from public, anon, authenticated;

-- Live notifications
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;
