import { PostCard } from "@/components/post/PostCard";
import type { Directory } from "@/types";
import type { FeedItem } from "./buildFeed";
import { NewsDigest } from "./NewsDigest";
import { SentimentCard } from "./SentimentCard";
import { SuggestedCommunities } from "./SuggestedCommunities";
import s from "./MixedFeed.module.scss";

export function MixedFeed({ items, dir }: { items: FeedItem[]; dir: Directory }) {
  return (
    <div className={s.feed}>
      {items.map((item) => {
        switch (item.kind) {
          case "post":
            return <PostCard key={item.key} post={item.post} dir={dir} />;
          case "suggested":
            return <SuggestedCommunities key={item.key} communities={item.communities} />;
          case "sentiment":
            return <SentimentCard key={item.key} sentiment={item.sentiment} />;
          case "news":
            return <NewsDigest key={item.key} items={item.items} dir={dir} />;
        }
      })}
    </div>
  );
}
