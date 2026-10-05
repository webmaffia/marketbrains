import { PageBanner } from "@/components/layout/PageBanner";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { CommentThread } from "@/components/post/CommentThread";
import { PostCard } from "@/components/post/PostCard";
import { getComments, getCommunity, getPost } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export async function generateMetadata({ params }: PageProps<"/community/[slug]/post/[postId]">): Promise<Metadata> {
  const { slug, postId } = await params;
  const post = await getPost(postId);
  if (!post) return {};
  const description = post.body.slice(0, 160);
  return {
    title: post.title,
    description,
    openGraph: { title: post.title, description, type: "article", url: `/community/${slug}/post/${postId}` },
    twitter: { card: "summary", title: post.title, description },
  };
}

export default async function PostPage({ params }: PageProps<"/community/[slug]/post/[postId]">) {
  const { slug, postId } = await params;
  const post = await getPost(postId);
  if (!post) notFound();

  const [comments, community, dir] = await Promise.all([getComments(postId), getCommunity(slug), getDirectory()]);
  return (
    <>
      <TopBar title="Discussion" back fallbackHref={`/community/${slug}`} />
      {community && <PageBanner size="slim" eyebrow="Discussing in" title={community.name} icon="users" hue={community.hue} cta={{ label: "Open community", href: `/community/${slug}` }} />}
      <PostCard post={post} dir={dir} detail />
      <CommentThread postId={post.id} comments={comments} dir={dir} />
    </>
  );
}
