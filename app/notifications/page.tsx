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
      <NotificationsView items={items} users={dir.users} />
    </>
  );
}
