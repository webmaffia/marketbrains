-- News intelligence: 50-word summary, why it matters, affected stocks and sectors, event type and signal.
-- Extends public.news in place. Safe to re-run.
alter table public.news add column if not exists full_summary      text;
alter table public.news add column if not exists why_it_matters    text[] not null default '{}';
alter table public.news add column if not exists event_type        text;
alter table public.news add column if not exists impact_direction  text check (impact_direction in ('positive', 'negative', 'neutral', 'mixed'));
alter table public.news add column if not exists impact_strength   text check (impact_strength in ('low', 'medium', 'high'));
alter table public.news add column if not exists signal_score      int  check (signal_score between 0 and 100);
alter table public.news add column if not exists signal_confidence numeric(3, 2) check (signal_confidence between 0 and 1);
alter table public.news add column if not exists affected_stocks   jsonb not null default '[]';
alter table public.news add column if not exists affected_sectors  text[] not null default '{}';
-- Several outlets covering one event share a cluster id (the first story's id). The first story is the "head".
alter table public.news add column if not exists cluster_id        text;
alter table public.news add column if not exists enriched_at       timestamptz;
alter table public.news add column if not exists enrich_attempts   int not null default 0;

create index if not exists news_cluster_idx  on public.news (cluster_id);
create index if not exists news_created_idx  on public.news (created_at desc);
create index if not exists news_pending_idx  on public.news (community_slug) where enriched_at is null;

-- What happened after an event. Filled in later by a price job; until then every row stays PENDING.
-- Describes the stock's reaction after the event, never that the event caused it.
create table if not exists public.news_outcomes (
  news_id               text primary key references public.news (id) on delete cascade,
  event_timestamp       timestamptz not null,
  expected_direction    text check (expected_direction in ('positive', 'negative', 'neutral', 'mixed')),
  signal_score          int,
  poll_sentiment        numeric(4, 3),
  stock_return_1d       numeric(8, 4),
  stock_return_5d       numeric(8, 4),
  stock_return_20d      numeric(8, 4),
  sector_return_1d      numeric(8, 4),
  sector_return_5d      numeric(8, 4),
  outcome_status        text not null default 'PENDING' check (outcome_status in ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED', 'PENDING')),
  updated_at            timestamptz not null default now()
);
alter table public.news_outcomes enable row level security;
drop policy if exists "public read" on public.news_outcomes;
create policy "public read" on public.news_outcomes for select using (true);

-- Longer, article-based summaries and the generic-news filter.
alter table public.news add column if not exists key_points      text[] not null default '{}';
alter table public.news add column if not exists summary_basis   text check (summary_basis in ('article', 'snippet', 'headline'));
alter table public.news add column if not exists hidden          boolean not null default false;
create index if not exists news_hidden_idx on public.news (hidden) where hidden;

-- Hindi version of each story: headline, summary, key points and why it matters.
alter table public.news add column if not exists title_hi          text;
alter table public.news add column if not exists summary_hi        text;
alter table public.news add column if not exists key_points_hi     text[] not null default '{}';
alter table public.news add column if not exists why_it_matters_hi text[] not null default '{}';
alter table public.news add column if not exists translated_at     timestamptz;
