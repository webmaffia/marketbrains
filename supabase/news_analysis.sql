-- AI analysis of news headlines (filled by the daily ingest job). Safe to re-run.
alter table public.news add column if not exists sentiment_score int check (sentiment_score between -100 and 100);
alter table public.news add column if not exists sentiment       text check (sentiment in ('bull', 'bear', 'neutral'));
alter table public.news add column if not exists topic           text;
alter table public.news add column if not exists summary         text;
alter table public.news add column if not exists analyzed_at     timestamptz;
