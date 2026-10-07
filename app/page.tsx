import { PageBanner } from "@/components/layout/PageBanner";
import { HomeFeed } from "@/features/home/HomeFeed";
import { WelcomeGate } from "@/features/welcome/welcomeGate";
import { HomeHeader } from "@/features/home/HomeHeader";
import { NewsMeter } from "@/features/community/NewsMeter";
import { getAllNews, getCommunities, getPosts } from "@/lib/api";
import { getDirectory } from "@/lib/directory";
import { buildNewsMeter } from "@/lib/newsSentiment";

export default async function HomePage() {
  const [posts, dir, communities, news] = await Promise.all([getPosts(), getDirectory(), getCommunities(), getAllNews()]);

  // Everything on the banner comes from real data: the most discussed post (if anyone has reacted yet) and today's news mood.
  const top = [...posts].filter((p) => p.likes + p.comments > 0).sort((a, b) => b.likes + b.comments * 2 - (a.likes + a.comments * 2))[0];
  const meter = buildNewsMeter(news);

  return (
    <>
      <WelcomeGate />
      <HomeHeader />
      <HomeFeed
        posts={posts}
        dir={dir}
        communities={communities}
        news={news}
        banner={
          <>
            {top && (
              <PageBanner
                eyebrow="Most discussed"
                title={top.title}
                text={`${top.comments} ${top.comments === 1 ? "comment" : "comments"} · ${top.likes} ${top.likes === 1 ? "like" : "likes"}`}
                icon="flame"
                hue={158}
                cta={{ label: "Join the discussion", href: `/community/${top.communitySlug}/post/${top.id}` }}
              />
            )}
            {meter && <NewsMeter meter={meter} name="Market" />}
          </>
        }
      />
    </>
  );
}
