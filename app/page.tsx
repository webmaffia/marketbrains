import { PageBanner } from "@/components/layout/PageBanner";
import { HomeFeed } from "@/features/home/HomeFeed";
import { HomeHeader } from "@/features/home/HomeHeader";
import { getAllNews, getCommunities, getPosts } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export default async function HomePage() {
  const [posts, dir, communities, news] = await Promise.all([getPosts(), getDirectory(), getCommunities(), getAllNews()]);
  return (
    <>
      <HomeHeader />
      <HomeFeed
        posts={posts}
        dir={dir}
        communities={communities}
        news={news}
        banner={
          <PageBanner
            eyebrow="Debate of the day"
            title="Is Tesla valued as a car company or an AI company?"
            text="112 investors are weighing in."
            icon="flame"
            hue={12}
            cta={{ label: "Join the debate", href: "/community/tesla/post/p6" }}
          />
        }
      />
    </>
  );
}
