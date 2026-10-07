"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/features/store/StoreProvider";
import { supabase } from "@/lib/supabase";
import type { Community } from "@/types";
import s from "./AdminNews.module.scss";

type Kind = "stock" | "index" | "sector" | "theme" | "topic";
const KINDS: { id: Kind; label: string }[] = [
  { id: "stock", label: "Stock" },
  { id: "index", label: "Index" },
  { id: "sector", label: "Sector" },
  { id: "theme", label: "Theme" },
  { id: "topic", label: "Topic" },
];
const EXCHANGES = ["NSE", "BSE", "NASDAQ", "NYSE", "CRYPTO"];
const KIND_LABEL: Record<Community["kind"], string> = { asset: "Stock", market: "Index", sector: "Sector", theme: "Theme", topic: "Topic" };

/** Admin-only community desk. The add_community / delete_community functions enforce admin access in the database; this screen just hides itself for everyone else. */
export function AdminCommunities({ communities }: { communities: Community[] }) {
  const router = useRouter();
  const { hydrated, profile, showToast } = useStore();
  const [kind, setKind] = useState<Kind>("stock");
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [exchange, setExchange] = useState("NSE");
  const [sector, setSector] = useState("");
  const [about, setAbout] = useState("");
  const [priceSymbol, setPriceSymbol] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  if (!hydrated) return null;
  if (!profile?.isAdmin) {
    return <EmptyState icon="lock" title="Admins only" text="Your account doesn't have access to this page." action={<Button href="/">Back home</Button>} />;
  }

  const listed = kind === "stock" || kind === "index";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("add_community", {
      p_kind: kind,
      p_name: name,
      p_ticker: listed ? ticker : null,
      p_exchange: exchange,
      p_sector: sector || null,
      p_about: about || null,
      p_price_symbol: priceSymbol || null,
      p_logo_domain: domain || null,
    });
    setBusy(false);
    if (error) return showToast(error.message);
    setName("");
    setTicker("");
    setSector("");
    setAbout("");
    setPriceSymbol("");
    setDomain("");
    showToast(`Added. Live at /community/${data}`);
    router.refresh();
  };

  const remove = async (c: Community) => {
    if (!confirm(`Delete ${c.name}? Its discussions, comments, news and members are deleted too. This cannot be undone.`)) return;
    const { error } = await supabase.rpc("delete_community", { p_slug: c.slug });
    if (error) return showToast(error.message);
    showToast("Community deleted");
    router.refresh();
  };

  const q = query.trim().toLowerCase();
  const shown = communities.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));

  return (
    <div className={s.wrap}>
      <form className={s.form} onSubmit={submit}>
        <label className={s.field}>
          <span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "stock" ? "Tata Power" : kind === "index" ? "NIFTY Bank" : "Dividend investing"} maxLength={60} required />
        </label>
        {listed && (
          <>
            <label className={s.field}>
              <span>Ticker</span>
              <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder={kind === "stock" ? "TATAPOWER" : "NIFTY BANK"} maxLength={20} required />
            </label>
            <label className={s.field}>
              <span>Exchange</span>
              <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
                {EXCHANGES.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span>Sector (optional)</span>
              <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Power" maxLength={40} />
            </label>
            <label className={s.field}>
              <span>Price symbol (optional)</span>
              <input value={priceSymbol} onChange={(e) => setPriceSymbol(e.target.value)} placeholder={kind === "index" ? "^NSEBANK" : "Defaults to TICKER.NS"} maxLength={30} />
            </label>
          </>
        )}
        <label className={s.field}>
          <span>{listed ? "About (optional)" : "Description"}</span>
          <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="One or two sentences" maxLength={300} required={!listed} />
        </label>
        <label className={s.field}>
          <span>Logo website (optional)</span>
          <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="tatapower.com" maxLength={60} />
        </label>
        <Button type="submit" block disabled={busy}>
          {busy ? "Adding…" : "Add community"}
        </Button>
      </form>

      <h2 className={s.h}>All communities ({communities.length})</h2>
      <label className={s.field}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search communities" />
      </label>
      <ul className={s.list}>
        {shown.map((c) => (
          <li key={c.slug} className={s.item}>
            <div>
              <p className={s.meta}>
                {KIND_LABEL[c.kind]} · /community/{c.slug}
              </p>
              <p className={s.title}>{c.name}</p>
            </div>
            <button type="button" className={s.del} onClick={() => remove(c)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
