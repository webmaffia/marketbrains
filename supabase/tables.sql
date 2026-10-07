-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id          text primary key,            -- auth.users.id::text for real accounts, slug-style ids for seed accounts
  username    text not null unique,
  name        text not null,
  bio         text not null default '',
  hue         int  not null default 160,
  reputation  int  not null default 0,
  tier        text not null default 'Rising Member',
  followers   int  not null default 0,
  following   int  not null default 0,
  discussions int  not null default 0,
  comments    int  not null default 0,
  helpful     int  not null default 0,
  verified    boolean not null default false,
  avatar_url  text,
  plan        text not null default 'free' check (plan in ('free', 'pro')),
  created_at  timestamptz not null default now()
);

create table if not exists public.assets (
  id       text primary key,
  ticker   text not null,
  name     text not null,
  exchange text not null,
  region   text not null,
  sector   text not null,
  about    text not null,
  themes   text[] not null default '{}'
);

create table if not exists public.topics (
  slug        text primary key,
  name        text not null,
  kind        text not null,
  description text not null
);

create table if not exists public.communities (
  slug        text primary key,
  name        text not null,
  kind        text not null,
  region      text not null,
  tagline     text not null,
  hue         int  not null default 160,
  members     int  not null default 0,
  discussions int  not null default 0,
  asset_id    text references public.assets (id),
  featured    boolean not null default false,
  logo_url    text
);

create table if not exists public.community_members (
  user_id        text not null references public.profiles (id) on delete cascade,
  community_slug text not null references public.communities (slug) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (user_id, community_slug)
);

create table if not exists public.posts (
  id             text primary key default gen_random_uuid()::text,
  author_id      text not null references public.profiles (id) on delete cascade,
  community_slug text not null references public.communities (slug) on delete cascade,
  topics         text[] not null default '{}',
  type           text not null default 'discussion' check (type in ('opinion','question','discussion','news','earnings','poll')),
  stance         text check (stance in ('bull','bear','neutral')),
  title          text not null check (char_length(title) between 8 and 140),
  body           text not null default '' check (char_length(body) <= 10000),
  has_image      boolean not null default false,
  likes          int not null default 0,
  comments       int not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists posts_created_idx   on public.posts (created_at desc);
create index if not exists posts_community_idx on public.posts (community_slug, created_at desc);
create index if not exists posts_author_idx    on public.posts (author_id, created_at desc);

create table if not exists public.polls (
  post_id  text primary key references public.posts (id) on delete cascade,
  question text not null,
  ends_at  timestamptz
);

create table if not exists public.poll_options (
  post_id  text not null references public.polls (post_id) on delete cascade,
  id       text not null,
  label    text not null,
  votes    int  not null default 0,
  position int  not null default 0,
  primary key (post_id, id)
);

create table if not exists public.poll_votes (
  user_id   text not null references public.profiles (id) on delete cascade,
  post_id   text not null,
  option_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id),
  foreign key (post_id, option_id) references public.poll_options (post_id, id) on delete cascade
);

create table if not exists public.comments (
  id         text primary key default gen_random_uuid()::text,
  post_id    text not null references public.posts (id) on delete cascade,
  author_id  text not null references public.profiles (id) on delete cascade,
  parent_id  text references public.comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  likes      int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.post_likes (
  user_id text not null references public.profiles (id) on delete cascade,
  post_id text not null references public.posts (id) on delete cascade,
  primary key (user_id, post_id)
);

create table if not exists public.comment_likes (
  user_id    text not null references public.profiles (id) on delete cascade,
  comment_id text not null references public.comments (id) on delete cascade,
  primary key (user_id, comment_id)
);

create table if not exists public.saves (
  user_id text not null references public.profiles (id) on delete cascade,
  post_id text not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.follows (
  follower_id text not null references public.profiles (id) on delete cascade,
  followee_id text not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists public.news (
  id               text primary key,
  community_slug   text not null references public.communities (slug) on delete cascade,
  source           text not null,
  headline         text not null,
  discussion_count int not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references public.profiles (id) on delete cascade,
  actor_id   text references public.profiles (id) on delete cascade,
  type       text not null check (type in ('like','comment','reply','follow','mention','community')),
  text       text not null,
  href       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- Added after first release (safe to re-run)
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.news     add column if not exists url text;
alter table public.posts    add column if not exists news_id text references public.news (id) on delete set null;
create index if not exists posts_news_idx on public.posts (news_id) where news_id is not null;
alter table public.posts    add column if not exists image_url text;

-- Web Push: one row per browser/device a member has enabled notifications on.
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    text not null references public.profiles (id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Profile details, privacy, not-interested and community sentiment
alter table public.profiles add column if not exists social_links jsonb not null default '{}';
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles drop constraint if exists profiles_bio_len;
alter table public.profiles add constraint profiles_bio_len check (char_length(bio) <= 280);

-- Private contact details. Only the owner can read this table; others see a field only if it was made public (see public_contact()).
create table if not exists public.profile_contacts (
  user_id      text primary key references public.profiles (id) on delete cascade,
  email        text,
  phone        text,
  email_public boolean not null default false,
  phone_public boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table if not exists public.muted_users (
  user_id    text not null references public.profiles (id) on delete cascade,
  muted_id   text not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id),
  check (user_id <> muted_id)
);

create table if not exists public.sentiment_votes (
  user_id        text not null references public.profiles (id) on delete cascade,
  community_slug text not null references public.communities (slug) on delete cascade,
  stance         text not null check (stance in ('bull', 'bear', 'neutral')),
  updated_at     timestamptz not null default now(),
  primary key (user_id, community_slug)
);
create index if not exists sentiment_votes_community_idx on public.sentiment_votes (community_slug);


-- AI analysis of news headlines (filled by the daily ingest job). Safe to re-run.
alter table public.news add column if not exists sentiment_score int check (sentiment_score between -100 and 100);
alter table public.news add column if not exists sentiment       text check (sentiment in ('bull', 'bear', 'neutral'));
alter table public.news add column if not exists topic           text;
alter table public.news add column if not exists summary         text;
alter table public.news add column if not exists analyzed_at     timestamptz;
