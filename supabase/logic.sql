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

  insert into public.profiles (id, username, name, hue, terms_accepted_at)
  values (new.id::text, candidate, left(base_name, 60), (abs(hashtext(new.id::text)) % 360),
          case when new.raw_user_meta_data ->> 'terms_accepted_at' is not null then now() end);
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
drop function if exists public.create_post(text, text[], text, text, text, text, boolean, text[], text);
create or replace function public.create_post(
  p_community text,
  p_topics text[],
  p_type text,
  p_stance text,
  p_title text,
  p_body text,
  p_has_image boolean default false,
  p_poll_options text[] default null,
  p_news_id text default null,
  p_image_url text default null
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

  -- Images must be uploads from this member's own folder in the post-images bucket.
  if nullif(p_image_url, '') is not null and position('/storage/v1/object/public/post-images/' || me || '/' in p_image_url) = 0 then
    raise exception 'Invalid image';
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

  insert into public.posts (author_id, community_slug, topics, type, stance, title, body, has_image, news_id, image_url)
  values (me, community, (coalesce(p_topics, '{}'))[1:3], case when p_poll_options is not null then 'poll' else kind end,
          p_stance, trim(p_title), trim(coalesce(p_body, '')), coalesce(p_has_image, false) or nullif(p_image_url, '') is not null, p_news_id, nullif(p_image_url, ''))
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

-- Registers this device for push. A device that was used by someone else before is re-assigned to the caller.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid()::text, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

-- Content rules (content_violation() is generated from lib/contentFilter.ts by scripts/build-sql.ts)
create or replace function public.guard_content() returns trigger
language plpgsql as $$
declare v text;
begin
  if tg_table_name = 'posts' then v := public.content_violation(new.title || E'\n' || new.body);
  elsif tg_table_name = 'comments' then v := public.content_violation(new.body);
  elsif tg_table_name = 'poll_options' then v := public.content_violation(new.label);
  end if;
  if v is not null then raise exception 'CONTENT_BLOCKED:%', v; end if;
  return new;
end $$;
drop trigger if exists trg_guard_posts on public.posts;
create trigger trg_guard_posts before insert on public.posts for each row execute function public.guard_content();
drop trigger if exists trg_guard_comments on public.comments;
create trigger trg_guard_comments before insert on public.comments for each row execute function public.guard_content();
drop trigger if exists trg_guard_options on public.poll_options;
create trigger trg_guard_options before insert on public.poll_options for each row execute function public.guard_content();

-- Profile editing: name, bio, private/public contact details, social links (unlocked after 5 discussions).
create or replace function public.save_profile(
  p_name text, p_bio text, p_email text, p_phone text,
  p_email_public boolean, p_phone_public boolean, p_social jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  me         text := auth.uid()::text;
  v          text;
  k          text;
  val        text;
  host       text;
  clean      jsonb := '{}';
  posts_n    int;
  phone_c    text;
  email_c    text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  p_name := trim(coalesce(p_name, ''));
  p_bio  := trim(coalesce(p_bio, ''));
  if char_length(p_name) < 2 or char_length(p_name) > 60 then raise exception 'Name must be 2 to 60 characters'; end if;
  if char_length(p_bio) > 280 then raise exception 'Bio can be up to 280 characters'; end if;
  v := public.content_violation(p_name || E'\n' || p_bio);
  if v is not null then raise exception 'CONTENT_BLOCKED:%', v; end if;

  email_c := nullif(trim(coalesce(p_email, '')), '');
  if email_c is not null and email_c !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'Enter a valid email address'; end if;
  phone_c := nullif(regexp_replace(coalesce(p_phone, ''), '[\s().-]', '', 'g'), '');
  if phone_c is not null and phone_c !~ '^\+?[0-9]{7,15}$' then raise exception 'Enter a valid mobile number, digits with an optional country code'; end if;

  if p_social is not null and jsonb_typeof(p_social) = 'object' then
    for k, val in select key, value from jsonb_each_text(p_social) loop
      val := trim(coalesce(val, ''));
      continue when val = '';
      if k not in ('x', 'linkedin', 'youtube', 'instagram', 'telegram', 'website') then raise exception 'Unknown link type'; end if;
      if char_length(val) > 200 or val !~* '^https://[^\s/]+(/\S*)?$' then raise exception 'Links must start with https://'; end if;
      host := regexp_replace(lower(substring(val from '^https://([^/\s:?#]+)')), '^www\.', '');
      if (k = 'x' and host not in ('x.com', 'twitter.com'))
         or (k = 'linkedin' and not (host = 'linkedin.com' or host like '%.linkedin.com'))
         or (k = 'youtube' and host not in ('youtube.com', 'm.youtube.com', 'youtu.be'))
         or (k = 'instagram' and not (host = 'instagram.com' or host like '%.instagram.com'))
         or (k = 'telegram' and host not in ('t.me', 'telegram.me')) then
        raise exception 'That link does not look like a % link', k;
      end if;
      clean := clean || jsonb_build_object(k, val);
    end loop;
  end if;

  select discussions into posts_n from public.profiles where id = me;
  if clean <> '{}'::jsonb and clean is distinct from (select social_links from public.profiles where id = me) and coalesce(posts_n, 0) < 5 then
    raise exception 'SOCIAL_LOCKED';
  end if;

  update public.profiles set name = p_name, bio = p_bio, social_links = clean where id = me;
  insert into public.profile_contacts (user_id, email, phone, email_public, phone_public, updated_at)
  values (me, email_c, phone_c, coalesce(p_email_public, false) and email_c is not null, coalesce(p_phone_public, false) and phone_c is not null, now())
  on conflict (user_id) do update set email = excluded.email, phone = excluded.phone,
    email_public = excluded.email_public, phone_public = excluded.phone_public, updated_at = now();
end $$;

-- What anyone may see of a member's contact details: only fields they chose to make public.
create or replace function public.public_contact(p_user text) returns table (email text, phone text)
language sql stable security definer set search_path = public as $$
  select case when email_public then email end, case when phone_public then phone end
  from public.profile_contacts where user_id = p_user and (email_public or phone_public)
$$;

-- Community sentiment: one view per member per community, changeable any time.
create or replace function public.set_sentiment(p_slug text, p_stance text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_stance not in ('bull', 'bear', 'neutral') then raise exception 'Invalid view'; end if;
  if not exists (select 1 from public.communities where slug = p_slug) then raise exception 'Unknown community'; end if;
  insert into public.sentiment_votes (user_id, community_slug, stance) values (auth.uid()::text, p_slug, p_stance)
  on conflict (user_id, community_slug) do update set stance = excluded.stance, updated_at = now();
end $$;

create or replace function public.sentiment_counts(p_slug text) returns table (bull int, bear int, neutral int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where stance = 'bull')::int, count(*) filter (where stance = 'bear')::int, count(*) filter (where stance = 'neutral')::int
  from public.sentiment_votes where community_slug = p_slug
$$;

-- Leaderboard: rewards useful writing, not volume.
--   post:    +5 if it has real substance (40+ characters), else +1; plus 2 per like and 3 per comment it earns (capped at 60 per post so one viral post can't dominate)
--   comment: +1 if it has substance (20+ characters); plus 2 per like (capped at 20)
create or replace function public.leaderboard(p_period text default 'week', p_community text default null, p_limit int default 50)
returns table (user_id text, username text, name text, avatar_url text, hue int, verified boolean, score int, posts int, comments int, likes int)
language sql stable security definer set search_path = public as $$
  with win as (
    select case p_period when 'week' then now() - interval '7 days' when 'month' then now() - interval '30 days' else '-infinity'::timestamptz end as since
  ),
  p as (
    select author_id, count(*)::int n, sum(likes)::int l,
           sum(case when char_length(body) >= 40 then 5 else 1 end + least(2 * likes + 3 * comments, 60))::int pts
    from public.posts, win
    where created_at >= win.since and (p_community is null or community_slug = p_community)
    group by author_id
  ),
  c as (
    select cm.author_id, count(*)::int n, sum(cm.likes)::int l,
           sum(case when char_length(cm.body) >= 20 then 1 else 0 end + least(2 * cm.likes, 20))::int pts
    from public.comments cm join public.posts po on po.id = cm.post_id, win
    where cm.created_at >= win.since and (p_community is null or po.community_slug = p_community)
    group by cm.author_id
  )
  select pr.id, pr.username, pr.name, pr.avatar_url, pr.hue, pr.verified,
         (coalesce(p.pts, 0) + coalesce(c.pts, 0))::int,
         coalesce(p.n, 0), coalesce(c.n, 0), coalesce(p.l, 0) + coalesce(c.l, 0)
  from public.profiles pr
  left join p on p.author_id = pr.id
  left join c on c.author_id = pr.id
  where coalesce(p.n, 0) + coalesce(c.n, 0) > 0
  order by 7 desc, pr.reputation desc, pr.name
  limit least(greatest(p_limit, 1), 100)
$$;

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
alter table public.push_subscriptions enable row level security;
alter table public.profile_contacts  enable row level security;
alter table public.muted_users       enable row level security;
alter table public.sentiment_votes   enable row level security;

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

drop policy if exists "own read"   on public.push_subscriptions;
drop policy if exists "own delete" on public.push_subscriptions;
create policy "own read"   on public.push_subscriptions for select using (user_id = public.uid());
create policy "own delete" on public.push_subscriptions for delete using (user_id = public.uid());

drop policy if exists "own read" on public.profile_contacts;
create policy "own read" on public.profile_contacts for select using (user_id = public.uid());

drop policy if exists "own read"   on public.muted_users;
drop policy if exists "own insert" on public.muted_users;
drop policy if exists "own delete" on public.muted_users;
create policy "own read"   on public.muted_users for select using (user_id = public.uid());
create policy "own insert" on public.muted_users for insert with check (user_id = public.uid());
create policy "own delete" on public.muted_users for delete using (user_id = public.uid());

drop policy if exists "own read" on public.sentiment_votes;
create policy "own read" on public.sentiment_votes for select using (user_id = public.uid());

drop policy if exists "own update" on public.profiles;
create policy "own update" on public.profiles for update using (id = public.uid()) with check (id = public.uid());

-- Column-level privileges: clients can never write counters, plan or notification content.
revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to anon, authenticated;

grant update (avatar_url)                          on public.profiles to authenticated;
grant insert, delete                               on public.post_likes, public.comment_likes, public.saves, public.follows, public.community_members to authenticated;
grant insert (post_id, option_id, user_id)         on public.poll_votes to authenticated;
grant insert (post_id, author_id, parent_id, body) on public.comments to authenticated;
grant delete                                       on public.comments, public.posts to authenticated;
grant update (read)                                on public.notifications to authenticated;

grant execute on function public.create_post(text, text[], text, text, text, text, boolean, text[], text, text) to authenticated;
grant execute on function public.add_news(text, text, text, text) to authenticated;
grant execute on function public.delete_news(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.upgrade_to_pro() to authenticated;
grant execute on function public.save_profile(text, text, text, text, boolean, boolean, jsonb) to authenticated;
grant execute on function public.set_sentiment(text, text) to authenticated;
grant execute on function public.public_contact(text) to anon, authenticated;
grant execute on function public.sentiment_counts(text) to anon, authenticated;
grant execute on function public.leaderboard(text, text, int) to anon, authenticated;
grant insert, delete on public.muted_users to authenticated;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant select, delete on public.push_subscriptions to authenticated;
revoke execute on function public.notify(text, text, text, text, text) from public, anon, authenticated;

-- Live notifications
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- ============================================================
-- Storage: post images (public read, members write only inside their own folder)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "post images upload" on storage.objects;
drop policy if exists "post images delete" on storage.objects;
create policy "post images upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "post images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Storage: avatars (public read, members write only inside their own folder)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists "avatars upload" on storage.objects;
drop policy if exists "avatars delete" on storage.objects;
create policy "avatars upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- A profile photo can only point at the member's own upload (or a seed placeholder), never an arbitrary URL.
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check check (
  avatar_url is null
  or avatar_url like 'https://i.pravatar.cc/%'
  or position('/storage/v1/object/public/avatars/' || id || '/' in avatar_url) > 0
);

