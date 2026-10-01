import type { Metadata } from "next";
import { PageBanner } from "@/components/layout/PageBanner";
import { TopBar } from "@/components/layout/TopBar";
import { PollsFeed } from "@/features/polls/PollsFeed";
import { getPolls } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export const metadata: Metadata = {
  title: "Polls",
  description: "Vote and see how other investors are leaning across markets, sectors and themes.",
};

export default async function PollsPage() {
  const [polls, dir] = await Promise.all([getPolls(), getDirectory()]);
  return (
    <>
      <TopBar title="Polls" />
      <PageBanner eyebrow="Community sentiment" title="Where does the crowd stand?" text="Cast your vote and see live results from the community." icon="poll" hue={150} />
      <PollsFeed polls={polls} dir={dir} />
    </>
  );
}
