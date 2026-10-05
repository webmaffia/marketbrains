import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { NotInterestedList } from "@/features/profile/NotInterestedList";
import { getUsers } from "@/lib/api";

export const metadata: Metadata = { title: "Not interested", robots: { index: false } };

export default async function NotInterestedPage() {
  const users = await getUsers();
  return (
    <>
      <TopBar title="Not interested" back fallbackHref="/profile" />
      <NotInterestedList users={users} />
    </>
  );
}
