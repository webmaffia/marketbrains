-- Replaces the demo member / discussion numbers with the real ones. Safe to re-run.
-- The triggers on community_members and posts keep them correct from here on.
update public.communities c set
  members     = (select count(*) from public.community_members m where m.community_slug = c.slug),
  discussions = (select count(*) from public.posts p where p.community_slug = c.slug);

-- Same for each profile's own totals.
update public.profiles u set
  discussions = (select count(*) from public.posts p where p.author_id = u.id),
  comments    = (select count(*) from public.comments k where k.author_id = u.id),
  followers   = (select count(*) from public.follows f where f.followee_id = u.id),
  following   = (select count(*) from public.follows f where f.follower_id = u.id);
