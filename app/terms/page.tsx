import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="5 October 2026">
      <p>By creating an account or using MarketBrains you agree to these terms. If you do not agree, please do not use the service.</p>

      <h2>1. What MarketBrains is</h2>
      <p>
        MarketBrains is a community for discussing markets and assets. It is not a broker, adviser or trading platform. Nothing on MarketBrains is investment, legal or tax advice, and nothing is an offer or solicitation to buy or
        sell any security or asset.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter a binding agreement.</li>
        <li>Give accurate information and keep your password safe. You are responsible for activity on your account.</li>
        <li>One person, one account. Do not impersonate others.</li>
      </ul>

      <h2>3. What you may not post</h2>
      <ul>
        <li>Buy, sell, short or hold recommendations, price targets, stop-loss or entry levels, tips, signals, or &quot;sure-shot&quot; and guaranteed-return claims.</li>
        <li>Abuse, harassment, hate speech, threats or sexual content.</li>
        <li>Spam, promotion, referral links, pump-and-dump or market manipulation, or content you do not have the right to share.</li>
        <li>Personal data of other people, including phone numbers and email addresses, without their consent.</li>
      </ul>
      <p>We use automated filters and may remove content or suspend accounts that break these rules, with or without notice.</p>

      <h2>4. Your content</h2>
      <p>
        You keep ownership of what you post. You give MarketBrains a worldwide, non-exclusive licence to host, display and distribute it within the service. Opinions expressed belong to their authors, not to MarketBrains.
      </p>

      <h2>5. Your profile and privacy</h2>
      <p>
        Your name, username, photo and bio are public. Your email address and mobile number are private unless you choose to make them public in your profile settings. See our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>6. Paid features</h2>
      <p>Some features, such as starting discussions, may require a paid plan. Prices and terms will be shown before you pay.</p>

      <h2>7. Disclaimer and liability</h2>
      <p>
        MarketBrains is provided &quot;as is&quot;. We do not guarantee that content is accurate, complete or current, including any delayed reference prices. To the extent permitted by law, we are not liable for any loss
        arising from your use of the service or from decisions you make based on content on it.
      </p>

      <h2>8. Ending your account</h2>
      <p>You can stop using MarketBrains at any time. We may suspend or end accounts that break these terms.</p>

      <h2>9. Changes and contact</h2>
      <p>We may update these terms and will show the date above. Continued use means you accept the update. Questions: please contact the MarketBrains team through the app.</p>
    </LegalPage>
  );
}
