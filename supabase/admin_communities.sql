-- Lets admins add and remove communities (stocks, indices, topics) from the app. Safe to re-run.
alter table public.assets add column if not exists price_symbol text;

create or replace function public.add_community(
  p_kind text, p_name text, p_ticker text default null, p_exchange text default 'NSE', p_sector text default null,
  p_about text default null, p_price_symbol text default null, p_logo_domain text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  nm text := trim(coalesce(p_name, ''));
  tk text := nullif(trim(coalesce(p_ticker, '')), '');
  ex text := upper(coalesce(nullif(trim(p_exchange), ''), 'NSE'));
  about text := nullif(trim(coalesce(p_about, '')), '');
  slug text;
  reg text := 'global';
  dom text := nullif(trim(coalesce(p_logo_domain, '')), '');
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_kind not in ('stock', 'index', 'sector', 'theme', 'topic') then raise exception 'Unknown type'; end if;
  if char_length(nm) < 2 or char_length(nm) > 60 then raise exception 'Name must be 2 to 60 characters'; end if;
  if p_kind in ('stock', 'index') and tk is null then raise exception 'Ticker is required'; end if;
  if p_kind in ('stock', 'index') and ex not in ('NSE', 'BSE', 'NASDAQ', 'NYSE', 'CRYPTO') then raise exception 'Unknown exchange'; end if;
  if dom is not null and dom !~* '^[a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'Logo domain should look like example.com'; end if;

  slug := trim(both '-' from regexp_replace(lower(replace(case when p_kind = 'stock' then tk else nm end, '&', 'and')), '[^a-z0-9]+', '-', 'g'));
  if slug = '' then raise exception 'Could not make a link name from that'; end if;
  if exists (select 1 from public.communities where communities.slug = add_community.slug) then raise exception 'A community with that name already exists'; end if;

  if p_kind in ('stock', 'index') then
    reg := case ex when 'NSE' then 'india' when 'BSE' then 'india' when 'CRYPTO' then 'crypto' else 'us' end;
    about := coalesce(about, nm || ' community.');
    insert into public.assets (id, ticker, name, exchange, region, sector, about, themes, price_symbol)
    values (slug, upper(tk), nm, ex, reg, coalesce(nullif(trim(p_sector), ''), case when p_kind = 'index' then 'Index' else 'Equities' end), about, '{}', nullif(trim(coalesce(p_price_symbol, '')), ''));
  end if;

  insert into public.communities (slug, name, kind, region, tagline, hue, asset_id, logo_url)
  values (
    slug, nm,
    case p_kind when 'stock' then 'asset' when 'index' then 'market' else p_kind end,
    reg, left(coalesce(split_part(about, '. ', 1), nm), 140), abs(hashtext(slug)) % 360,
    case when p_kind in ('stock', 'index') then slug end,
    case when dom is not null then 'https://icon.horse/icon/' || dom end
  );
  return slug;
end $$;

-- Removing a community also removes its discussions, comments, news and memberships.
create or replace function public.delete_community(p_slug text) returns void
language plpgsql security definer set search_path = public as $$
declare aid text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select asset_id into aid from public.communities where slug = p_slug;
  delete from public.communities where slug = p_slug;
  if aid is not null and not exists (select 1 from public.communities where asset_id = aid) then
    delete from public.assets where id = aid;
  end if;
end $$;

grant execute on function public.add_community(text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.delete_community(text) to authenticated;
