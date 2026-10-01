# MarketBrains

Mobile-first investor community PWA (Next.js 16, App Router, TypeScript, SCSS modules). A social network organised around financial assets, not a trading terminal: no prices, charts or signals.

```bash
npm install
npm run dev              # http://localhost:3000
npm run build && npm start   # service worker is registered in production only
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
| `data/` + `types/` | Typed mock data and models (User, Post, Comment, Community, Asset, Topic, Notification, Poll) |
| `lib/api.ts` | The only module that reads `data/`. Swap its bodies for `fetch` calls to connect a backend |
| `styles/` | `_tokens.scss` (mixins) and `globals.scss` (CSS-variable tokens, light/dark) |
| `public/` | `sw.js`, `offline.html`, `icons/` |

## Behaviour

- Browsing is open. Like, comment, follow, join, save, vote and notifications open the login/signup bottom sheet when signed out.
- Creating a discussion needs a signed-in **Pro** user. The profile and `/create` both offer a demo upgrade.
- Mock auth: any email and password signs in as "Javed". State (session, likes, follows, posts, comments, drafts) persists in `localStorage` under `mb-state-v1`.
- Pages are server components. Only interactive pieces are client components.

## Before launch

Replace the placeholder icons, replace `lib/api.ts` with real endpoints, and set `NEXT_PUBLIC_SITE_URL`.
# marketbrains
