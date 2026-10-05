# MarketBrains

Mobile-first investor community PWA (Next.js 16, App Router, TypeScript, SCSS modules, Supabase). A social network organised around financial assets, not a trading terminal: no prices, charts or signals.

## Setup

1. Copy `.env.example` to `.env` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. In the Supabase dashboard open **SQL Editor**, paste the contents of [`supabase/setup.sql`](supabase/setup.sql) and run it. It creates the tables, row level security, triggers and RPCs, and seeds the starter communities, people and discussions. It is safe to re-run.
3. **Authentication → Providers → Email** is on by default. With "Confirm email" enabled, new members get a confirmation link before their first sign-in; turn it off while developing if you prefer.
4. Realtime notifications need the `notifications` table in the `supabase_realtime` publication. `setup.sql` adds it; check **Database → Replication** if the bell does not update live.

```bash
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # service worker is registered in production only
npm run db:build             # regenerate supabase/setup.sql after editing supabase/*.sql or data/
node scripts/gen-icons.mjs   # regenerate placeholder PWA icons
```

## Structure

| Path | Purpose |
| --- | --- |
| `app/` | Routes: `/`, `/discover`, `/following`, `/notifications`, `/profile`, `/community/[slug]`, `/community/[slug]/post/[postId]`, `/user/[username]`, `/search`, `/create`, plus `manifest.ts` |
| `components/ui` | Primitives: Icon, UserAvatar, TopicChip, BottomSheet, SearchBar, SegmentTabs, EmptyState, LoadingSkeleton, Button, Toast |
| `components/layout` | AppShell, BottomNav, TopBar |
| `components/post`, `community`, `user` | PostCard, PollCard, CommentThread, LikeButton, CommunityCard/Header/Tabs, AssetCard, NotificationItem, UserProfile, FollowButton |
| `features/` | Screen-level logic: home, discover, following, notifications, profile, search, composer, auth, `store` |
| `types/` | App models (User, Post, Comment, Community, Asset, Topic, Notification, Poll) |
| `data/` | Seed content only. `npm run db:build` turns it into SQL; the app never imports it |
| `supabase/` | `tables.sql`, `logic.sql` (triggers, RLS, RPCs) and the generated `setup.sql` |
| `lib/supabase.ts`, `lib/api.ts`, `lib/mappers.ts` | Supabase client, public read queries, and row-to-model mappers |
| `styles/` | `_tokens.scss` (mixins) and `globals.scss` (CSS-variable tokens, light/dark) |
| `public/` | `sw.js`, `offline.html`, `icons/` |

## Behaviour

- Browsing is open and server-rendered from Supabase. Like, comment, follow, join, save, vote and notifications open the login/signup bottom sheet when signed out.
- Auth is Supabase email + password. A database trigger creates the member's profile on sign-up.
- Likes, saves, follows, memberships, votes, comments and posts are written to Supabase. Counters (likes, comments, followers, members, poll votes) and notifications are maintained by database triggers, and clients cannot write them directly (row level security + column grants).
- Creating a discussion or poll goes through the `create_post` RPC and needs a **Pro** member. The "Upgrade to Pro" button calls `upgrade_to_pro()`, a demo stand-in until a payment provider is connected.
- Drafts are kept in `localStorage` on the device.

## Known gaps

- Image attachments in the composer are a placeholder (no upload yet; needs Supabase Storage).
- Pro upgrade has no payment step.
- Seed accounts (Priya, Arjun, ...) are fictional content; delete their rows from `profiles` to remove them and everything they wrote.
