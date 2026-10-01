import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { CommentThread } from "@/components/post/CommentThread";
import { PostCard } from "@/components/post/PostCard";
import { LocalPostView } from "@/features/community/LocalPostView";
import { getComments, getPost, getPosts } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.communitySlug, postId: p.id }));
}

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
  const dir = await getDirectory();

  // Posts created locally (id "mine-…") have no server record in the mock data.
  if (!post) {
    if (!postId.startsWith("mine-")) notFound();
    return (
      <>
        <TopBar title="Discussion" back fallbackHref={`/community/${slug}`} />
        <LocalPostView postId={postId} dir={dir} />
      </>
    );
  }

  const comments = await getComments(postId);
  return (
    <>
      <TopBar title="Discussion" back fallbackHref={`/community/${slug}`} />
      <PostCard post={post} dir={dir} detail />
      <CommentThread postId={post.id} comments={comments} dir={dir} />
    </>
  );
}
