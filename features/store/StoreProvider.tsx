"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { mapComment, mapNotification, mapUser, USER_SELECT } from "@/lib/mappers";
import { disablePush } from "@/lib/push";
import { supabase } from "@/lib/supabase";
import type { Comment, Notification, Plan, Post, User } from "@/types";

/** Everything that belongs to the signed-in user. Loaded from Supabase after sign-in. */
interface UserState {
  profile: User | null;
  liked: string[];
  likedComments: string[];
  saved: string[];
  following: string[];
  joined: string[];
  votes: Record<string, string>;
  notifications: Notification[];
}

const EMPTY: UserState = {
  profile: null,
  liked: [],
  likedComments: [],
  saved: [],
  following: [],
  joined: [],
  votes: {},
  notifications: [],
};

const DRAFT_KEY = "mb-draft-v1";

export type AuthMode = "login" | "signup";
interface AuthSheetState {
  open: boolean;
  mode: AuthMode;
  reason?: string;
}

export interface NewPost {
  communitySlug: string;
  topics: string[];
  type: Post["type"];
  stance?: Post["stance"];
  title: string;
  body: string;
  /** Public URL of an uploaded image (see PostComposer). */
  imageUrl?: string;
  pollOptions?: string[];
  /** Set when the post is a reaction to a news item. */
  newsId?: string;
}

interface Store extends UserState {
  hydrated: boolean;
  isLoggedIn: boolean;
  session: { userId: string; plan: Plan } | null;
  unreadCount: number;
  draft: string;
  auth: AuthSheetState;
  toast: string | null;
  openAuth: (reason?: string, mode?: AuthMode) => void;
  closeAuth: () => void;
  setAuthMode: (m: AuthMode) => void;
  /** Resolve to an error message, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (name: string, email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  logout: () => void;
  upgrade: () => void;
  /** Runs fn if signed in, otherwise opens the auth sheet with a reason. */
  guard: (reason: string, fn: () => void) => void;
  toggleLike: (postId: string) => void;
  toggleCommentLike: (id: string) => void;
  toggleSave: (postId: string) => void;
  toggleFollow: (userId: string) => void;
  toggleJoin: (slug: string) => void;
  vote: (postId: string, optionId: string) => void;
  addPost: (p: NewPost) => Promise<string | null>;
  addComment: (postId: string, body: string, parentId?: string) => Promise<Comment | null>;
  /** Sets (or, with null, removes) the member's profile photo. Resolves true on success. */
  updateAvatar: (file: File | null) => Promise<boolean>;
  /** Deletes one of the signed-in member's own discussions (and its image). Resolves true on success. */
  deletePost: (postId: string, imageUrl?: string) => Promise<boolean>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setDraft: (v: string) => void;
  showToast: (m: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const NOTIF_SELECT = "*, actor:profiles!actor_id(*)";

async function loadUserState(userId: string): Promise<UserState> {
  const [profile, likes, cLikes, saves, follows, members, votes, notifs] = await Promise.all([
    supabase.from("profiles").select(USER_SELECT).eq("id", userId).maybeSingle(),
    supabase.from("post_likes").select("post_id").eq("user_id", userId),
    supabase.from("comment_likes").select("comment_id").eq("user_id", userId),
    supabase.from("saves").select("post_id").eq("user_id", userId),
    supabase.from("follows").select("followee_id").eq("follower_id", userId),
    supabase.from("community_members").select("community_slug").eq("user_id", userId),
    supabase.from("poll_votes").select("post_id, option_id").eq("user_id", userId),
    supabase.from("notifications").select(NOTIF_SELECT).eq("user_id", userId).order("created_at", { ascending: false }).limit(60),
  ]);
  return {
    profile: profile.data ? mapUser(profile.data) : null,
    liked: (likes.data ?? []).map((r) => r.post_id),
    likedComments: (cLikes.data ?? []).map((r) => r.comment_id),
    saved: (saves.data ?? []).map((r) => r.post_id),
    following: (follows.data ?? []).map((r) => r.followee_id),
    joined: (members.data ?? []).map((r) => r.community_slug),
    votes: Object.fromEntries((votes.data ?? []).map((r) => [r.post_id, r.option_id])),
    notifications: (notifs.data ?? []).map(mapNotification),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UserState>(EMPTY);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraftState] = useState("");
  const [auth, setAuth] = useState<AuthSheetState>({ open: false, mode: "login" });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const patch = useCallback((p: Partial<UserState> | ((s: UserState) => Partial<UserState>)) => {
    setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));
  }, []);

  const showToast = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  // Drafts stay on the device; everything else lives in Supabase.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setDraftState(localStorage.getItem(DRAFT_KEY) ?? "");
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Follow the Supabase auth session. The callback only records the user id; data loads in the effect below.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setAuthChecked(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Load (or clear) the user's data whenever the signed-in user changes.
  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!userId) {
      setState(EMPTY);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    loadUserState(userId).then((s) => {
      if (cancelled) return;
      setState(s);
      setLoaded(true);
    });
    /* eslint-enable react-hooks/set-state-in-effect */

    // New notifications arrive live.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, async () => {
        const { data } = await supabase.from("notifications").select(NOTIF_SELECT).eq("user_id", userId).order("created_at", { ascending: false }).limit(60);
        if (!cancelled && data) patch({ notifications: data.map(mapNotification) });
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId, authChecked, patch]);

  const value = useMemo<Store>(() => {
    const hydrated = authChecked && loaded;
    const isLoggedIn = !!userId;
    const session = userId ? { userId, plan: (state.profile?.plan ?? "free") as Plan } : null;
    const guard: Store["guard"] = (reason, fn) => {
      if (isLoggedIn) fn();
      else setAuth({ open: true, mode: "login", reason });
    };

    /** Applies the change now, writes it to Supabase, and rolls back with a toast if the write fails. */
    const optimistic = (apply: () => void, revert: () => void, write: PromiseLike<{ error: { message: string } | null }>, failure = "Something went wrong. Try again.") => {
      apply();
      write.then(({ error }) => {
        if (error) {
          revert();
          showToast(failure);
        }
      });
    };

    /** Toggle membership of `id` in a list backed by a join table. */
    const toggleRow = (
      key: "liked" | "likedComments" | "saved" | "following" | "joined",
      id: string,
      table: string,
      row: Record<string, string>,
      del: Record<string, string>,
    ) => {
      const was = state[key].includes(id);
      const flip = () => patch((s) => ({ [key]: toggle(s[key], id) }) as Partial<UserState>);
      optimistic(
        flip,
        flip,
        was
          ? Object.entries(del).reduce((q, [k, v]) => q.eq(k, v), supabase.from(table).delete())
          : supabase.from(table).insert(row),
      );
      return was;
    };

    const me = userId ?? "";
    const setDraft = (v: string) => {
      setDraftState(v);
      try {
        if (v) localStorage.setItem(DRAFT_KEY, v);
        else localStorage.removeItem(DRAFT_KEY);
      } catch {}
    };

    return {
      ...state,
      hydrated,
      isLoggedIn,
      session,
      unreadCount: state.notifications.filter((n) => !n.read).length,
      draft,
      auth,
      toast,
      showToast,
      guard,
      openAuth: (reason, mode = "login") => setAuth({ open: true, mode, reason }),
      closeAuth: () => setAuth((a) => ({ ...a, open: false })),
      setAuthMode: (mode) => setAuth((a) => ({ ...a, mode })),

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return error.message;
        setAuth((a) => ({ ...a, open: false }));
        showToast("Welcome back");
        return null;
      },
      signUp: async (name, email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
        if (error) return { error: error.message, needsConfirmation: false };
        // No session means the project requires email confirmation before first sign-in.
        if (!data.session) return { error: null, needsConfirmation: true };
        setAuth((a) => ({ ...a, open: false }));
        showToast(`Welcome, ${name}`);
        return { error: null, needsConfirmation: false };
      },
      logout: () => {
        // Drop this device's push subscription first so the next person on it doesn't get this account's alerts.
        disablePush()
          .catch(() => {})
          .then(() => supabase.auth.signOut())
          .then(() => showToast("Signed out"));
      },
      upgrade: () => {
        supabase.rpc("upgrade_to_pro").then(({ error }) => {
          if (error) return showToast("Couldn't upgrade. Try again.");
          patch((s) => (s.profile ? { profile: { ...s.profile, plan: "pro" } } : {}));
          showToast("You're now a Pro member");
        });
      },

      toggleLike: (id) => guard("Sign in to like posts", () => void toggleRow("liked", id, "post_likes", { user_id: me, post_id: id }, { user_id: me, post_id: id })),
      toggleCommentLike: (id) =>
        guard("Sign in to like comments", () => void toggleRow("likedComments", id, "comment_likes", { user_id: me, comment_id: id }, { user_id: me, comment_id: id })),
      toggleSave: (id) =>
        guard("Sign in to save posts", () => {
          const was = toggleRow("saved", id, "saves", { user_id: me, post_id: id }, { user_id: me, post_id: id });
          showToast(was ? "Removed from saved" : "Saved");
        }),
      toggleFollow: (id) =>
        guard("Sign in to follow people", () => {
          if (id === me) return;
          toggleRow("following", id, "follows", { follower_id: me, followee_id: id }, { follower_id: me, followee_id: id });
        }),
      toggleJoin: (slug) =>
        guard("Sign in to join communities", () => {
          const was = toggleRow("joined", slug, "community_members", { user_id: me, community_slug: slug }, { user_id: me, community_slug: slug });
          showToast(was ? "Left community" : "Joined community");
        }),
      vote: (postId, optionId) =>
        guard("Sign in to vote", () => {
          if (state.votes[postId]) return;
          optimistic(
            () => patch((s) => ({ votes: { ...s.votes, [postId]: optionId } })),
            () =>
              patch((s) => ({ votes: Object.fromEntries(Object.entries(s.votes).filter(([id]) => id !== postId)) })),
            supabase.from("poll_votes").insert({ user_id: me, post_id: postId, option_id: optionId }),
            "Couldn't record your vote. The poll may have ended.",
          );
        }),

      addPost: async (p) => {
        const { data, error } = await supabase.rpc("create_post", {
          p_community: p.communitySlug,
          p_topics: p.topics,
          p_type: p.type,
          p_stance: p.stance ?? null,
          p_title: p.title,
          p_body: p.body,
          p_has_image: !!p.imageUrl,
          p_poll_options: p.pollOptions ?? null,
          p_news_id: p.newsId ?? null,
          p_image_url: p.imageUrl ?? null,
        });
        if (error) {
          showToast(error.message.includes("Pro") ? "Discussions are for Pro members" : "Couldn't post. Try again.");
          return null;
        }
        setDraft("");
        return data as string;
      },
      addComment: async (postId, body, parentId) => {
        if (!isLoggedIn) {
          setAuth({ open: true, mode: "login", reason: "Sign in to comment" });
          return null;
        }
        const { data, error } = await supabase.from("comments").insert({ post_id: postId, author_id: me, parent_id: parentId ?? null, body }).select().single();
        if (error || !data) {
          showToast("Couldn't post your comment");
          return null;
        }
        return mapComment(data);
      },

      updateAvatar: async (file) => {
        const previous = state.profile?.avatarUrl;
        let path: string | null = null;
        let url: string | null = null;
        if (file) {
          path = `${me}/avatar-${Date.now()}.webp`;
          const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
          if (error) {
            showToast("Couldn't upload your photo. Try again.");
            return false;
          }
          url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
        }
        const { data, error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", me).select("id");
        if (error || !data?.length) {
          if (path) supabase.storage.from("avatars").remove([path]).then(() => {});
          showToast("Couldn't save your photo. Try again.");
          return false;
        }
        patch((s) => (s.profile ? { profile: { ...s.profile, avatarUrl: url ?? undefined } } : {}));
        // Tidy up the file we just replaced (only our own uploads live in the avatars bucket).
        const old = previous?.split("/avatars/")[1];
        if (old) supabase.storage.from("avatars").remove([decodeURIComponent(old)]).then(() => {});
        showToast(file ? "Profile photo updated" : "Profile photo removed");
        return true;
      },
      deletePost: async (postId, imageUrl) => {
        const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("id");
        if (error || !data?.length) {
          showToast("Couldn't delete this discussion");
          return false;
        }
        const path = imageUrl?.split("/post-images/")[1];
        if (path) supabase.storage.from("post-images").remove([decodeURIComponent(path)]).then(() => {});
        showToast("Discussion deleted");
        return true;
      },
      markRead: (id) => {
        const item = state.notifications.find((n) => n.id === id);
        if (!item || item.read) return;
        patch((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
        supabase.from("notifications").update({ read: true }).eq("id", id).then(() => {});
      },
      markAllRead: () => {
        const ids = state.notifications.filter((n) => !n.read).map((n) => n.id);
        if (!ids.length) return;
        patch((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
        supabase.from("notifications").update({ read: true }).in("id", ids).then(() => {});
      },
      setDraft,
    };
  }, [state, userId, authChecked, loaded, draft, auth, toast, patch, showToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
