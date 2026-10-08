"use client";

import Link from "next/link";
import { CommunityBadge } from "@/components/community/CommunityCard";
import { Icon } from "@/components/ui/Icon";
import { SocialIcon } from "@/components/ui/SocialIcon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useState } from "react";
import { useStore } from "@/features/store/StoreProvider";
import { compact } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { EditProfileSheet } from "@/features/profile/EditProfileSheet";
import type { Community, PublicContact, User } from "@/types";
import { AvatarEditor } from "./AvatarEditor";
import { FollowButton } from "./FollowButton";
import s from "./UserProfile.module.scss";

const SOCIAL_LABELS: Record<string, string> = { x: "X", linkedin: "LinkedIn", youtube: "YouTube", instagram: "Instagram", telegram: "Telegram", website: "Website" };

interface Props {
  user: User;
  communities: Community[];
  isSelf?: boolean;
  /** Contact details this person chose to make public (server-fetched). */
  contact?: PublicContact;
}

export function UserProfile({ user, communities, isSelf: selfProp, contact }: Props) {
  const { isLoggedIn, hydrated, following, joined, session, showToast, contact: myContact, muted, toggleMute } = useStore();
  const [editing, setEditing] = useState(false);
  const isSelf = selfProp ?? session?.userId === user.id;
  // Server counts include follows made before the page loaded; offset by what changes afterwards.
  const [wasFollowing, setWasFollowing] = useState<boolean | null>(null);
  if (hydrated && wasFollowing === null) setWasFollowing(following.includes(user.id));
  const followers = user.followers + (wasFollowing === null ? 0 : Number(following.includes(user.id)) - Number(wasFollowing));
  const shareProfile = async () => {
    const url = `${location.origin}/user/${user.username}`;
    const data = { title: `${user.name} (@${user.username}) on MarketBrains`, text: `Follow ${user.name} on MarketBrains`, url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        showToast("Profile link copied");
      }
    } catch {}
  };

  const contactRows: { icon: "mail" | "phone"; text: string; href: string; tag?: string }[] = [];
  if (isSelf && myContact) {
    if (myContact.email) contactRows.push({ icon: "mail", text: myContact.email, href: `mailto:${myContact.email}`, tag: myContact.emailPublic ? "Public" : "Private" });
    if (myContact.phone) contactRows.push({ icon: "phone", text: myContact.phone, href: `tel:${myContact.phone}`, tag: myContact.phonePublic ? "Public" : "Private" });
  } else if (!isSelf && contact) {
    if (contact.email) contactRows.push({ icon: "mail", text: contact.email, href: `mailto:${contact.email}` });
    if (contact.phone) contactRows.push({ icon: "phone", text: contact.phone, href: `tel:${contact.phone}` });
  }
  const socials = Object.entries(user.socialLinks ?? {}).filter(([k, v]) => v && SOCIAL_LABELS[k]);
  const isMuted = muted.includes(user.id);

  const myCommunities = isSelf && isLoggedIn ? communities.filter((x) => joined.includes(x.slug)) : communities;

  return (
    <>
      <div className={s.cover} style={{ "--h": user.hue } as React.CSSProperties} aria-hidden="true" />
      <section className={s.head}>
        <button type="button" className={s.share} onClick={shareProfile} aria-label="Share profile">
          <Icon name="share" size={20} />
        </button>
        {isSelf ? <AvatarEditor user={user} size={84} /> : <span className={s.ring}><UserAvatar user={user} size={84} /></span>}
        <h2 className={s.name}>
          {user.name}
          {user.verified && <Icon name="verified" size={18} filled className={s.verified} />}
        </h2>
        <p className={s.handle}>@{user.username}</p>
        <p className={s.bio}>{user.bio}</p>
        <div className={s.rep}>
          <Icon name="sparkle" size={16} />
          <strong>{compact(user.reputation)}</strong> reputation · {user.tier}
          {isSelf && (session?.plan === "pro") && <span className={s.pro}>PRO</span>}
        </div>
        {(contactRows.length > 0 || socials.length > 0) && (
          <div className={s.about}>
            {contactRows.map((r) => (
              <a key={r.icon} href={r.href} className={s.contact}>
                <Icon name={r.icon} size={16} />
                <span>{r.text}</span>
                {r.tag && <em className={r.tag === "Public" ? s.tagPublic : s.tagPrivate}>{r.tag}</em>}
              </a>
            ))}
            {socials.length > 0 && (
              <ul className={s.socials}>
                {socials.map(([k, v]) => (
                  <li key={k}>
                    <a href={v} target="_blank" rel="noopener noreferrer nofollow ugc" aria-label={SOCIAL_LABELS[k]} title={SOCIAL_LABELS[k]}>
                      <SocialIcon name={k} size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {isSelf ? (
          <div className={s.cta}>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Icon name="edit" size={16} /> Edit profile
            </Button>
          </div>
        ) : (
          <div className={s.cta}>
            <FollowButton userId={user.id} size="md" />
            <button type="button" className={s.quiet} onClick={() => toggleMute(user.id, user.name)}>
              <Icon name="block" size={15} /> {isMuted ? "Undo not interested" : "Not interested"}
            </button>
          </div>
        )}
      </section>
      {isSelf && <EditProfileSheet open={editing} onClose={() => setEditing(false)} />}

      <p className={s.follows}>
        {compact(followers)} followers · {compact(user.following)} following
      </p>

      {myCommunities.length > 0 && (
        <section aria-labelledby="joined">
          <h2 id="joined" className={s.h}>
            Communities
          </h2>
          <div className={`${s.rail} hide-scrollbar`}>
            {myCommunities.slice(0, 10).map((x) => (
              <Link key={x.slug} href={`/community/${x.slug}`} className={s.comm}>
                <CommunityBadge community={x} size={44} />
                <span>{x.name.length > 14 ? x.name.split(" ")[0] : x.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

    </>
  );
}
