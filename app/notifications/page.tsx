import { PageBanner } from "@/components/layout/PageBanner";
import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsView } from "@/features/notifications/NotificationsView";
import { getNotifications } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const [items, dir] = await Promise.all([getNotifications(), getDirectory()]);
  return (
    <>
      <TopBar title="Notifications" />
      <PageBanner size="slim" title="Stay in the loop" text="Replies, mentions and new followers." icon="bell" hue={330} />
      <NotificationsView items={items} users={dir.users} />
    </>
  );
}
