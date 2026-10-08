import { buildNewsMeters } from "@/lib/newsSentiment";
import type { Community, NewsItem, SentimentCounts } from "@/types";
import { CommunityInsights } from "./CommunityInsights";
import { CommunityPulse } from "./CommunityPulse";
import { NewsMeter } from "./NewsMeter";
import s from "./CommunityOverview.module.scss";

interface Props {
  community: Community;
  /** Members' views. */
  sentiment: SentimentCounts;
  news: NewsItem[];
  /** Today's price move, used to compare what the news says with what the market did. */
  changePct?: number | null;
}

/** The top of a community page: members' mood, the news mood and what the news adds up to. */
export function CommunityOverview({ community, sentiment, news, changePct }: Props) {
  return (
    <div className={s.wrap}>
      <CommunityPulse slug={community.slug} name={community.name} base={sentiment} />
      <NewsMeter meters={buildNewsMeters(news)} name={community.name} />
      <CommunityInsights name={community.name} posts={[]} news={news} changePct={changePct} />
    </div>
  );
}
