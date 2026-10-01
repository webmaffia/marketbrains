"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Error({ unstable_retry }: { error: Error; unstable_retry: () => void }) {
  return <EmptyState icon="close" title="Something went wrong" text="We couldn't load this. Check your connection and try again." action={<Button onClick={() => unstable_retry()}>Try again</Button>} />;
}
