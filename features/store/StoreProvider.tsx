"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ME_ID } from "@/data/users";
import type { Comment, Plan, Post } from "@/types";

/** Local mock state. Replace the setters with API mutations when a backend exists. */
interface Persisted {
  session: { userId: string; plan: Plan } | null;
  liked: string[];
  likedComments: string[];
  saved: string[];
  following: string[];
  joined: string[];
  votes: Record<string, string>;
  myPosts: Post[];
  myComments: Comment[];
  readNotifs: string[];
  draft: string;
}

const EMPTY: Persisted = {
  session: null,
  liked: [],
  likedComments: [],
  saved: [],
  following: [],
  joined: [],
  votes: {},
  myPosts: [],
  myComments: [],
  readNotifs: [],
  draft: "",
};

const KEY = "mb-state-v1";
const SEED_FOLLOWING = ["u_priya", "u_arjun", "u_david", "u_sofia"];
const SEED_JOINED = ["reliance", "tcs", "bitcoin", "nvidia", "long-term-investing"];

export type AuthMode = "login" | "signup";
interface AuthSheetState {
  open: boolean;
  mode: AuthMode;
  reason?: string;
}

interface Store extends Persisted {
  hydrated: boolean;
  isLoggedIn: boolean;
  auth: AuthSheetState;
  toast: string | null;
  openAuth: (reason?: string, mode?: AuthMode) => void;
  closeAuth: () => void;
  setAuthMode: (m: AuthMode) => void;
  login: (name?: string) => void;
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
  addPost: (p: Omit<Post, "id" | "authorId" | "ageMin" | "likes" | "comments">) => string;
  addComment: (postId: string, body: string, parentId?: string) => void;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [auth, setAuth] = useState<AuthSheetState>({ open: false, mode: "login" });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Hydrate from localStorage after mount so server and first client render match.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const patch = useCallback((p: Partial<Persisted> | ((s: Persisted) => Partial<Persisted>)) => {
    setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));
  }, []);

  const showToast = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const value = useMemo<Store>(() => {
    const isLoggedIn = !!state.session;
    const guard: Store["guard"] = (reason, fn) => {
      if (isLoggedIn) fn();
      else setAuth({ open: true, mode: "login", reason });
    };
    return {
      ...state,
      hydrated,
      isLoggedIn,
      auth,
      toast,
      showToast,
      openAuth: (reason, mode = "login") => setAuth({ open: true, mode, reason }),
      closeAuth: () => setAuth((a) => ({ ...a, open: false })),
      setAuthMode: (mode) => setAuth((a) => ({ ...a, mode })),
      login: () => {
        patch((s) => ({
          session: { userId: ME_ID, plan: s.session?.plan ?? "free" },
          following: s.following.length ? s.following : SEED_FOLLOWING,
          joined: s.joined.length ? s.joined : SEED_JOINED,
        }));
        setAuth((a) => ({ ...a, open: false }));
        showToast("Welcome back, Javed");
      },
      logout: () => {
        patch({ session: null });
        showToast("Signed out");
      },
      upgrade: () => {
        patch((s) => (s.session ? { session: { ...s.session, plan: "pro" } } : {}));
        showToast("You're now a Pro member");
      },
      guard,
      toggleLike: (id) => guard("Sign in to like posts", () => patch((s) => ({ liked: toggle(s.liked, id) }))),
      toggleCommentLike: (id) => guard("Sign in to like comments", () => patch((s) => ({ likedComments: toggle(s.likedComments, id) }))),
      toggleSave: (id) =>
        guard("Sign in to save posts", () => {
          const was = state.saved.includes(id);
          patch((s) => ({ saved: toggle(s.saved, id) }));
          showToast(was ? "Removed from saved" : "Saved");
        }),
      toggleFollow: (id) => guard("Sign in to follow people", () => patch((s) => ({ following: toggle(s.following, id) }))),
      toggleJoin: (slug) =>
        guard("Sign in to join communities", () => {
          const was = state.joined.includes(slug);
          patch((s) => ({ joined: toggle(s.joined, slug) }));
          showToast(was ? "Left community" : "Joined community");
        }),
      vote: (postId, optionId) => guard("Sign in to vote", () => patch((s) => (s.votes[postId] ? {} : { votes: { ...s.votes, [postId]: optionId } }))),
      addPost: (p) => {
        const id = `mine-${Date.now()}`;
        patch((s) => ({ myPosts: [{ ...p, id, authorId: ME_ID, ageMin: 0, likes: 0, comments: 0 }, ...s.myPosts], draft: "" }));
        return id;
      },
      addComment: (postId, body, parentId) =>
        guard("Sign in to comment", () =>
          patch((s) => ({
            myComments: [...s.myComments, { id: `mc-${Date.now()}`, postId, authorId: ME_ID, parentId, body, ageMin: 0, likes: 0 }],
          })),
        ),
      markRead: (id) => patch((s) => ({ readNotifs: s.readNotifs.includes(id) ? s.readNotifs : [...s.readNotifs, id] })),
      markAllRead: (ids) => patch((s) => ({ readNotifs: Array.from(new Set([...s.readNotifs, ...ids])) })),
      setDraft: (draft) => patch({ draft }),
    };
  }, [state, hydrated, auth, toast, patch, showToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
