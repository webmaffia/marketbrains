import type { Metadata } from "next";
import { WelcomeScreen } from "@/features/welcome/WelcomeScreen";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return <WelcomeScreen />;
}
