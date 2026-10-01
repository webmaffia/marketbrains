import { HomeFeed } from "@/features/home/HomeFeed";
import { HomeHeader } from "@/features/home/HomeHeader";
import { getPosts } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export default async function HomePage() {
  const [posts, dir] = await Promise.all([getPosts(), getDirectory()]);
  return (
    <>
      <HomeHeader />
      <HomeFeed posts={posts} dir={dir} />
    </>
  );
}
