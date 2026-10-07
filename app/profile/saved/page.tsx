import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { SavedList } from "@/features/profile/SavedList";
import { getDirectory } from "@/lib/directory";

export const metadata: Metadata = { title: "Saved posts", robots: { index: false } };

export default async function SavedPage() {
  const dir = await getDirectory();
  return (
    <>
      <TopBar title="Saved posts" back fallbackHref="/profile" />
      <SavedList dir={dir} />
    </>
  );
}
