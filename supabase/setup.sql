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

-- ============================================================
-- Seed content (generated by scripts/build-sql.ts)
-- ============================================================

insert into public.assets (id, ticker, name, exchange, region, sector, about, themes) values
  ('reliance', 'RELIANCE', 'Reliance Industries', 'NSE', 'india', 'Energy & Conglomerates', 'Diversified conglomerate across energy, retail, telecom and new energy. Members debate capital allocation and the retail and digital arms.', array['Retail expansion', 'New energy', 'Telecom']::text[]),
  ('tcs', 'TCS', 'Tata Consultancy Services', 'NSE', 'india', 'IT Services', 'India''s largest IT services company. Members discuss deal wins, attrition, AI''s impact on services and capital returns.', array['Deal pipeline', 'AI & services', 'Dividends']::text[]),
  ('hdfc-bank', 'HDFCBANK', 'HDFC Bank', 'NSE', 'india', 'Banking', 'Private-sector banking leader post-merger. Conversation centres on deposit growth, integration and credit quality.', array['Merger integration', 'Deposit growth', 'Credit quality']::text[]),
  ('infosys', 'INFY', 'Infosys', 'NSE', 'india', 'IT Services', 'Global IT services and consulting. Members follow guidance, margins and large-deal momentum.', array['Guidance', 'Large deals', 'Margins']::text[]),
  ('nvidia', 'NVDA', 'NVIDIA', 'NASDAQ', 'us', 'Semiconductors', 'The AI infrastructure conversation. Members debate competition, supply constraints and how durable the demand cycle is.', array['AI infrastructure', 'Competition', 'Supply chain']::text[]),
  ('apple', 'AAPL', 'Apple', 'NASDAQ', 'us', 'Consumer Technology', 'Ecosystem, services and hardware cycles. Members compare long-term moats and product bets.', array['Services growth', 'Ecosystem', 'Buybacks']::text[]),
  ('tesla', 'TSLA', 'Tesla', 'NASDAQ', 'us', 'Electric Vehicles', 'EVs, energy and autonomy. One of the most opinionated communities on the platform.', array['Autonomy', 'Energy storage', 'Manufacturing']::text[]),
  ('bitcoin', 'BTC', 'Bitcoin', 'CRYPTO', 'crypto', 'Digital Assets', 'Store-of-value debates, adoption and the long arc of digital scarcity.', array['Adoption', 'Self-custody', 'Regulation']::text[]),
  ('ethereum', 'ETH', 'Ethereum', 'CRYPTO', 'crypto', 'Digital Assets', 'Smart-contract platform conversations: scaling, staking and the application layer.', array['Scaling', 'Staking', 'Applications']::text[]),
  ('solana', 'SOL', 'Solana', 'CRYPTO', 'crypto', 'Digital Assets', 'High-throughput chain community. Builders and holders trade perspectives on ecosystem growth.', array['Throughput', 'Ecosystem', 'Developers']::text[])
on conflict do nothing;

insert into public.topics (slug, name, kind, description) values
  ('banking', 'Banking', 'sector', 'Lenders, deposits, credit cycles and regulation.'),
  ('it-services', 'IT Services', 'sector', 'Outsourcing, consulting and the AI shift.'),
  ('ev', 'Electric Vehicles', 'sector', 'EV makers, batteries and charging.'),
  ('energy', 'Energy', 'sector', 'Oil, gas, renewables and the transition.'),
  ('ai-boom', 'AI Boom', 'theme', 'Who captures value from the AI build-out?'),
  ('dividend-investing', 'Dividend Investing', 'theme', 'Income, payout sustainability and growth.'),
  ('long-term-investing', 'Long-Term Investing', 'theme', 'Compounding, patience and conviction.'),
  ('earnings-season', 'Earnings Season', 'topic', 'Quarterly results, call notes and reactions.'),
  ('beginners', 'Beginners', 'topic', 'No question is too basic. Learn together.'),
  ('valuation-debates', 'Valuation Debates', 'topic', 'How should we value this business?'),
  ('ipos', 'IPOs', 'topic', 'New listings and what to read in the prospectus.')
on conflict do nothing;

insert into public.communities (slug, name, kind, region, tagline, hue, members, discussions, asset_id, featured, logo_url) values
  ('reliance', 'Reliance Industries', 'asset', 'india', 'Diversified conglomerate across energy, retail, telecom and new energy.', 24, 8200, 2100, 'reliance', true, 'https://icon.horse/icon/ril.com'),
  ('tcs', 'Tata Consultancy Services', 'asset', 'india', 'India''s largest IT services company.', 210, 6400, 1620, 'tcs', true, 'https://icon.horse/icon/tcs.com'),
  ('hdfc-bank', 'HDFC Bank', 'asset', 'india', 'Private-sector banking leader post-merger.', 150, 5900, 1480, 'hdfc-bank', false, 'https://icon.horse/icon/hdfcbank.com'),
  ('infosys', 'Infosys', 'asset', 'india', 'Global IT services and consulting.', 190, 4700, 1190, 'infosys', false, 'https://icon.horse/icon/infosys.com'),
  ('nvidia', 'NVIDIA', 'asset', 'us', 'The AI infrastructure conversation.', 120, 12800, 3900, 'nvidia', true, 'https://icon.horse/icon/nvidia.com'),
  ('apple', 'Apple', 'asset', 'us', 'Ecosystem, services and hardware cycles.', 30, 9100, 2750, 'apple', false, 'https://icon.horse/icon/apple.com'),
  ('tesla', 'Tesla', 'asset', 'us', 'EVs, energy and autonomy.', 12, 11200, 4300, 'tesla', false, 'https://icon.horse/icon/tesla.com'),
  ('bitcoin', 'Bitcoin', 'asset', 'crypto', 'Store-of-value debates, adoption and the long arc of digital scarcity.', 40, 15400, 5200, 'bitcoin', true, 'https://icon.horse/icon/bitcoin.org'),
  ('ethereum', 'Ethereum', 'asset', 'crypto', 'Smart-contract platform conversations: scaling, staking and the application layer.', 260, 8900, 2600, 'ethereum', false, 'https://icon.horse/icon/ethereum.org'),
  ('solana', 'Solana', 'asset', 'crypto', 'High-throughput chain community.', 300, 5300, 1540, 'solana', false, 'https://icon.horse/icon/solana.com'),
  ('nse', 'NSE', 'market', 'india', 'National Stock Exchange conversations.', 255, 41200, 12800, null, false, 'https://icon.horse/icon/nseindia.com'),
  ('bse', 'BSE', 'market', 'india', 'Asia''s oldest exchange, discussed daily.', 215, 22600, 6900, null, false, 'https://icon.horse/icon/bseindia.com'),
  ('nyse', 'NYSE', 'market', 'us', 'Blue chips and big debates.', 190, 28400, 9100, null, false, 'https://icon.horse/icon/nyse.com'),
  ('nasdaq', 'NASDAQ', 'market', 'us', 'Tech, growth and innovation.', 280, 36800, 14200, null, false, 'https://icon.horse/icon/nasdaq.com'),
  ('banking', 'Banking', 'sector', 'global', 'Lenders, deposits, credit cycles and regulation.', 20, 2400, 600, null, false, null),
  ('it-services', 'IT Services', 'sector', 'global', 'Outsourcing, consulting and the AI shift.', 67, 3770, 910, null, false, null),
  ('ev', 'Electric Vehicles', 'sector', 'global', 'EV makers, batteries and charging.', 114, 5140, 1220, null, false, null),
  ('energy', 'Energy', 'sector', 'global', 'Oil, gas, renewables and the transition.', 161, 6510, 1530, null, false, null),
  ('ai-boom', 'AI Boom', 'theme', 'global', 'Who captures value from the AI build-out?', 208, 7880, 1840, null, false, null),
  ('dividend-investing', 'Dividend Investing', 'theme', 'global', 'Income, payout sustainability and growth.', 255, 9250, 2150, null, false, null),
  ('long-term-investing', 'Long-Term Investing', 'theme', 'global', 'Compounding, patience and conviction.', 302, 10620, 2460, null, false, null),
  ('earnings-season', 'Earnings Season', 'topic', 'global', 'Quarterly results, call notes and reactions.', 349, 11990, 2770, null, false, null),
  ('beginners', 'Beginners', 'topic', 'global', 'No question is too basic. Learn together.', 36, 13360, 3080, null, false, null),
  ('valuation-debates', 'Valuation Debates', 'topic', 'global', 'How should we value this business?', 83, 14730, 3390, null, false, null),
  ('ipos', 'IPOs', 'topic', 'global', 'New listings and what to read in the prospectus.', 130, 16100, 3700, null, false, null)
on conflict do nothing;

insert into public.profiles (id, username, name, bio, hue, reputation, tier, followers, following, discussions, comments, helpful, verified, avatar_url) values
  ('u_priya', 'priya.invests', 'Priya Raman', 'Consumer & retail watcher. I read annual reports for fun.', 330, 4210, 'Community Pillar', 2840, 190, 61, 903, 412, true, 'https://i.pravatar.cc/300?img=47'),
  ('u_arjun', 'arjun_k', 'Arjun Kapoor', 'IT services & global capability centres. Ex-analyst.', 200, 3120, 'Community Pillar', 1530, 220, 38, 640, 288, false, 'https://i.pravatar.cc/300?img=33'),
  ('u_meera', 'meera.s', 'Meera Shah', 'Banking cycles, credit growth and everything in between.', 150, 2670, 'Trusted Contributor', 980, 134, 29, 512, 201, false, 'https://i.pravatar.cc/300?img=29'),
  ('u_david', 'david.m', 'David Moore', 'Semis, AI infrastructure, and the occasional contrarian take.', 28, 3590, 'Community Pillar', 2210, 305, 47, 771, 330, true, 'https://i.pravatar.cc/300?img=15'),
  ('u_sofia', 'sofia_onchain', 'Sofia Alvarez', 'On-chain research. Bitcoin first, everything else second.', 45, 2480, 'Trusted Contributor', 1760, 98, 33, 420, 176, false, 'https://i.pravatar.cc/300?img=44'),
  ('u_rahul', 'rahul.v', 'Rahul Verma', 'First-time investor. Learning in public.', 100, 410, 'Rising Member', 54, 260, 6, 88, 19, false, 'https://i.pravatar.cc/300?img=60'),
  ('u_kenji', 'kenji.t', 'Kenji Tanaka', 'EV supply chains and manufacturing economics.', 12, 1930, 'Trusted Contributor', 640, 112, 19, 301, 120, false, 'https://i.pravatar.cc/300?img=52'),
  ('u_ananya', 'ananya.reads', 'Ananya Iyer', 'Earnings call notes, summarised for humans.', 285, 2890, 'Trusted Contributor', 1190, 175, 41, 466, 230, false, 'https://i.pravatar.cc/300?img=38')
on conflict do nothing;

insert into public.community_members (user_id, community_slug) values
  ('u_priya', 'reliance'),
  ('u_priya', 'hdfc-bank'),
  ('u_priya', 'dividend-investing'),
  ('u_arjun', 'tcs'),
  ('u_arjun', 'infosys'),
  ('u_arjun', 'it-services'),
  ('u_meera', 'hdfc-bank'),
  ('u_meera', 'banking'),
  ('u_david', 'nvidia'),
  ('u_david', 'apple'),
  ('u_david', 'ai-boom'),
  ('u_sofia', 'bitcoin'),
  ('u_sofia', 'ethereum'),
  ('u_sofia', 'solana'),
  ('u_rahul', 'beginners'),
  ('u_rahul', 'tcs'),
  ('u_kenji', 'tesla'),
  ('u_kenji', 'ev'),
  ('u_ananya', 'earnings-season'),
  ('u_ananya', 'reliance'),
  ('u_ananya', 'infosys')
on conflict do nothing;

insert into public.posts (id, author_id, community_slug, topics, type, stance, title, body, has_image, likes, comments, created_at) values
  ('p1', 'u_ananya', 'reliance', array['long-term-investing', 'valuation-debates']::text[], 'question', 'neutral', 'Is Reliance''s retail expansion still undervalued?', 'Store count keeps growing and the omnichannel push is real, but the market seems to treat retail as a footnote to energy. What are investors expecting from the next quarter, and how much of the story is already understood?', false, 42, 18, now() - interval '120 minutes'),
  ('p2', 'u_david', 'nvidia', array['ai-boom']::text[], 'opinion', 'bull', 'The moat is the software stack, not the chip', 'Everyone compares hardware specs. But years of developer tooling is why switching costs are so high. Competitors need to win the ecosystem, not just the benchmark.', false, 128, 47, now() - interval '35 minutes'),
  ('p3', 'u_arjun', 'tcs', array['it-services', 'earnings-season']::text[], 'earnings', 'neutral', 'TCS results: what stood out on the call?', 'Deal TCV was healthy, attrition cooled again and management sounded careful on discretionary spend. I''d love to hear what others took away, especially on the AI services commentary.', false, 76, 31, now() - interval '190 minutes'),
  ('p4', 'u_sofia', 'bitcoin', array['long-term-investing']::text[], 'poll', null, 'How do you hold your long-term crypto?', 'Curious how this community thinks about custody. No wrong answers.', false, 94, 22, now() - interval '260 minutes'),
  ('p5', 'u_meera', 'hdfc-bank', array['banking']::text[], 'discussion', 'bull', 'Merger integration is quieter than people expected', 'Branch network and deposit mix are settling. The interesting debate now is how fast the credit-deposit ratio normalises and what that means for growth over the next few years.', false, 58, 26, now() - interval '300 minutes'),
  ('p6', 'u_kenji', 'tesla', array['ev', 'valuation-debates']::text[], 'opinion', 'bear', 'Is Tesla valued as a car company or an AI company?', 'I keep going back and forth. If autonomy is the story, the vehicle business is almost a distribution channel. If not, the multiple is hard to justify. Where do you land?', true, 203, 112, now() - interval '410 minutes'),
  ('p7', 'u_rahul', 'tcs', array['beginners', 'dividend-investing']::text[], 'question', 'neutral', 'Beginner question: how do I read a dividend payout ratio?', 'I keep seeing people mention payout ratio when talking about TCS. Is higher better? How do I know if a dividend is sustainable?', false, 37, 24, now() - interval '470 minutes'),
  ('p8', 'u_priya', 'reliance', array['earnings-season']::text[], 'earnings', 'bull', 'Retail segment commentary was the highlight for me', 'Management spent more time on same-store growth and new formats than on energy. That tells me where they want the narrative to go. Anyone else notice?', false, 88, 39, now() - interval '540 minutes'),
  ('p9', 'u_david', 'apple', array['ai-boom', 'valuation-debates']::text[], 'discussion', 'neutral', 'Does Apple win AI by being the distribution layer?', 'The bear case is they''re behind on models. The bull case is that a billion devices matter more than model leadership. Both seem plausible to me.', false, 145, 83, now() - interval '620 minutes'),
  ('p10', 'u_sofia', 'ethereum', array['long-term-investing']::text[], 'news', 'neutral', 'Reaction: latest scaling upgrade ships on schedule', 'Shipping on time matters for credibility. What I want to know is whether application usage follows or whether this just lowers fees without changing behaviour.', false, 61, 29, now() - interval '700 minutes'),
  ('p11', 'u_ananya', 'infosys', array['it-services', 'earnings-season']::text[], 'earnings', 'bear', 'Guidance was cautious. Is that a reset or just conservatism?', 'Infosys has a history of guiding carefully and beating. The question is whether this time reflects real demand softness in BFSI.', false, 70, 35, now() - interval '800 minutes'),
  ('p12', 'u_priya', 'dividend-investing', array['dividend-investing', 'long-term-investing']::text[], 'discussion', 'neutral', 'Dividend growth vs high yield: what''s your philosophy?', 'I used to chase yield. After two cuts, I now prefer companies that grow payouts steadily even from a lower base. How do you balance it?', false, 112, 64, now() - interval '900 minutes'),
  ('p13', 'u_kenji', 'solana', array['long-term-investing']::text[], 'poll', null, 'What matters most for a chain''s long-term case?', 'Trying to understand what this community values.', false, 49, 18, now() - interval '1100 minutes'),
  ('p14', 'u_rahul', 'beginners', array['beginners']::text[], 'question', 'neutral', 'How long did it take you to feel comfortable investing?', 'I''m six months in and still second-guessing everything. Would love to hear how others built confidence without overtrading.', false, 160, 97, now() - interval '1300 minutes'),
  ('p15', 'u_david', 'nvidia', array['ai-boom']::text[], 'opinion', 'bear', 'Customers building their own silicon is the real risk', 'It isn''t a rival chip company that worries me. It''s the largest buyers deciding that part of the stack is worth owning. How realistic is that on a multi-year view?', false, 187, 102, now() - interval '1500 minutes'),
  ('p16', 'u_meera', 'banking', array['banking', 'valuation-debates']::text[], 'discussion', 'neutral', 'How do you think about price-to-book for banks?', 'ROE and asset quality both feed into it, but I rarely see people state which they weight more. What''s your framework?', false, 83, 41, now() - interval '1700 minutes')
on conflict do nothing;

insert into public.polls (post_id, question, ends_at) values
  ('p4', 'Where do you keep your long-term holdings?', null),
  ('p13', 'What matters most for long-term adoption?', null)
on conflict do nothing;

insert into public.poll_options (post_id, id, label, votes, position) values
  ('p4', 'o1', 'Self-custody (hardware wallet)', 612, 1),
  ('p4', 'o2', 'Exchange custody', 284, 2),
  ('p4', 'o3', 'ETF / regulated product', 351, 3),
  ('p4', 'o4', 'A mix of these', 198, 4),
  ('p13', 'o1', 'Developer ecosystem', 402, 1),
  ('p13', 'o2', 'Reliability / uptime', 268, 2),
  ('p13', 'o3', 'Low fees', 177, 3),
  ('p13', 'o4', 'Decentralisation', 133, 4)
on conflict do nothing;

insert into public.comments (id, post_id, author_id, parent_id, body, likes, created_at) values
  ('c1', 'p1', 'u_priya', null, 'Retail''s contribution has been rising for years, but it''s hard to separate from the group story. I think the market underappreciates how much operating leverage new formats could add.', 24, now() - interval '95 minutes'),
  ('c3', 'p1', 'u_arjun', null, 'Counterpoint: conglomerate discounts exist for a reason. Capital allocation across very different businesses is hard to underwrite.', 17, now() - interval '70 minutes'),
  ('c4', 'p1', 'u_rahul', null, 'As a beginner, this thread is a great way to learn how people think about segments. Thanks for asking this.', 9, now() - interval '40 minutes'),
  ('c6', 'p2', 'u_arjun', null, 'Switching costs are real, but customers with scale will invest to reduce dependence. The moat is deep, not permanent.', 31, now() - interval '25 minutes'),
  ('c8', 'p3', 'u_ananya', null, 'Management tone on discretionary spend stood out to me. They didn''t sound alarmed, but they didn''t sound bullish either.', 14, now() - interval '150 minutes'),
  ('c9', 'p6', 'u_david', null, 'Honestly both. The debate shows how much of this is about narrative versus unit economics.', 40, now() - interval '380 minutes'),
  ('c10', 'p7', 'u_priya', null, 'Higher isn''t automatically better. A very high payout can mean there''s little left to reinvest. Compare it with earnings stability and cash flow.', 33, now() - interval '440 minutes'),
  ('c2', 'p1', 'u_ananya', 'c1', 'Agree on formats. What I''m watching is same-store growth, because that tells you whether expansion is healthy or just adding square footage.', 11, now() - interval '80 minutes'),
  ('c5', 'p1', 'u_ananya', 'c3', 'Fair point. I''d still want to see how the market values the retail arm on its own before calling it undervalued.', 5, now() - interval '30 minutes'),
  ('c7', 'p2', 'u_sofia', 'c6', 'Depends how fast the alternatives mature. Tooling takes years to catch up.', 8, now() - interval '12 minutes')
on conflict do nothing;

insert into public.news (id, community_slug, source, headline, discussion_count, created_at) values
  ('nw1', 'reliance', 'Market Desk', 'Reliance retail unveils new store formats across smaller cities', 46, now() - interval '180 minutes'),
  ('nw2', 'reliance', 'Business Wire', 'Telecom arm outlines plans for next phase of network rollout', 22, now() - interval '600 minutes'),
  ('nw3', 'reliance', 'Market Desk', 'New energy gigafactory timelines discussed at annual meeting', 31, now() - interval '1500 minutes'),
  ('nw4', 'tcs', 'Market Desk', 'TCS announces fresh multi-year deals with global clients', 37, now() - interval '240 minutes'),
  ('nw5', 'nvidia', 'Tech Report', 'Cloud providers expand AI capacity plans for the coming year', 64, now() - interval '320 minutes'),
  ('nw6', 'bitcoin', 'Chain Weekly', 'Regulators publish updated custody guidance for digital assets', 58, now() - interval '400 minutes')
on conflict do nothing;

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
