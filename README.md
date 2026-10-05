# MarketBrains

Mobile-first investor community PWA (Next.js 16, App Router, TypeScript, SCSS modules, Supabase). A social network organised around financial assets, not a trading terminal: no prices, charts or signals.

## Setup

1. Copy `.env.example` to `.env` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
2. In the Supabase dashboard open **SQL Editor**, paste the contents of [`supabase/setup.sql`](supabase/setup.sql) and run it. It creates the tables, row level security, triggers and RPCs, and seeds the starter communities, people and discussions. It is safe to re-run.
3. **Authentication → Providers → Email** is on by default. With "Confirm email" enabled, new members get a confirmation link before their first sign-in; turn it off while developing if you prefer.
4. Realtime notifications need the `notifications` table in the `supabase_realtime` publication. `setup.sql` adds it; check **Database → Replication** if the bell does not update live.

### Push notifications (PWA)

Members can turn on push alerts per device (Alerts or Profile screen). Delivery works like this: a database row is inserted into `notifications` -> a Supabase Database Webhook calls `POST /api/push` -> the route sends a Web Push to each of that member's saved devices.

1. Generate keys once with `npx web-push generate-vapid-keys` and set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (see `.env.example`).
2. Set `PUSH_WEBHOOK_SECRET` to any long random string, and `SUPABASE_SERVICE_ROLE_KEY` to the secret key from **Project Settings -> API keys**. The service key is server-only; never prefix it with `NEXT_PUBLIC_`.
3. In Supabase go to **Database -> Webhooks -> Create a new hook**: table `notifications`, event **Insert**, type **HTTP Request**, method `POST`, URL `https://YOUR-SITE/api/push`, and add the HTTP header `x-push-secret` with the same value as `PUSH_WEBHOOK_SECRET`. The URL must be publicly reachable, so use your deployed site (or a tunnel such as ngrok while testing).
4. Push only works in the production build (the service worker is not registered by `npm run dev`), over HTTPS or localhost. On iPhone, the site must be added to the Home Screen first (iOS 16.4+).

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
- Discussions can carry one image (JPG/PNG/WebP/GIF, up to 5 MB). Photos are downscaled in the browser, uploaded to the public `post-images` Storage bucket under the member's own folder, and linked through `create_post`.
- Members can set or remove their profile photo (camera button on their own profile). It is cropped to a square in the browser, stored in the public `avatars` bucket under their own folder, and the database only accepts avatar URLs that point at that folder.
- Drafts are kept in `localStorage` on the device.

## Known gaps

- Pro upgrade has no payment step.
- Seed accounts (Priya, Arjun, ...) are fictional content; delete their rows from `profiles` to remove them and everything they wrote.
