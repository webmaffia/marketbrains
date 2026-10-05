import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="5 October 2026">
      <p>
        This policy explains what MarketBrains collects, why, and the choices you have. It applies together with our <Link href="/terms">Terms & Conditions</Link>.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address, password (stored hashed by our authentication provider) and the date you accepted our terms.
        </li>
        <li>
          <strong>Profile:</strong> name, username, photo, bio and, if you add them, a contact email, mobile number and social links.
        </li>
        <li>
          <strong>Activity:</strong> posts, comments, likes, saves, follows, community memberships and poll votes.
        </li>
        <li>
          <strong>Device:</strong> if you turn on push notifications, a push subscription for that browser or device.
        </li>
      </ul>

      <h2>What is public and what is private</h2>
      <ul>
        <li>Public: name, username, photo, bio, posts, comments and social links (once unlocked).</li>
        <li>Private by default: your sign-in email, contact email and mobile number. Contact email and mobile number are shown to others only if you switch them to public in Edit profile.</li>
        <li>Always private: who you marked &quot;not interested&quot;, what you saved, and your notifications.</li>
      </ul>

      <h2>How we use it</h2>
      <p>To run the community, show you relevant content, send notifications you asked for, keep the service safe and prevent abuse. We do not sell your personal data.</p>

      <h2>Who processes it</h2>
      <p>We use Supabase for authentication, database and file storage, and your browser vendor&apos;s push service to deliver notifications you enable.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit or remove your bio, contact details, social links and photo at any time in your profile.</li>
        <li>Turn push notifications off in Alerts or Profile.</li>
        <li>Ask us to delete your account and data through the app&apos;s support contact.</li>
      </ul>

      <h2>Changes</h2>
      <p>We will update the date above when this policy changes.</p>
    </LegalPage>
  );
}
