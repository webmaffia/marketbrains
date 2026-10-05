import { PageBanner } from "@/components/layout/PageBanner";
import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { NotificationsView } from "@/features/notifications/NotificationsView";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <>
      <TopBar title="Notifications" />
      <PageBanner size="slim" title="Stay in the loop" text="Replies, mentions and new followers." icon="bell" hue={175} />
      <NotificationsView />
    </>
  );
}
