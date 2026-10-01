"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { useStore } from "@/features/store/StoreProvider";
import type { ReactNode } from "react";

/** Creating a discussion needs a signed-in Pro member. Browsing never does. */
export function CreateGate({ children }: { children: ReactNode }) {
  const { isLoggedIn, session, hydrated, openAuth, upgrade } = useStore();

  if (!hydrated) return <TopBar title="New discussion" back />;

  if (!isLoggedIn) {
    return (
      <>
        <TopBar title="New discussion" back />
        <EmptyState icon="lock" title="Sign in to start a discussion" text="You can browse freely. Posting needs an account." action={<Button onClick={() => openAuth("Sign in to start a discussion")}>Sign in</Button>} />
      </>
    );
  }

  if (session?.plan !== "pro") {
    return (
      <>
        <TopBar title="New discussion" back />
        <EmptyState
          icon="sparkle"
          title="Discussions are for Pro members"
          text="Pro members start discussions and polls so conversations stay thoughtful. Everyone can comment and vote."
          action={<Button onClick={upgrade}>Upgrade to Pro (demo)</Button>}
        />
      </>
    );
  }

  return <>{children}</>;
}
