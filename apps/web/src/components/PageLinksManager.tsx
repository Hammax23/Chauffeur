"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, MousePointerClick, ListPlus, CheckCircle2, Pencil, Save, X,
  Crosshair, ExternalLink, AlertTriangle,
} from "lucide-react";
import { getScope, locateMentions, locateAnchors, textNodesIn, type DomMention, type AnchorInfo } from "@/lib/autolink-dom";

interface PageOpt { path: string; label: string }
interface TextLink {
  id: string; pagePath: string; phrase: string; url: string; occurrence: number; newTab: boolean; isActive: boolean;
  kind: string; removeLink: boolean; newText: string | null;
}
interface RelatedLink { id: string; label: string; url: string; isActive: boolean; sortOrder: number }
interface BlogOption { slug: string; title: string; status: string }

const field =
  "w-full px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500";
const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed";
const btnGhost =
  "inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white text-gray-800 rounded-lg text-xs font-semibold hover:bg-gray-50";

const normPath = (p: string) => {
  let x = (p || "/").trim().split("#")[0].split("?")[0];
  if (!x.startsWith("/")) x = `/${x}`;
  if (x.length > 1) x = x.replace(/\/+$/, "");
  return x || "/";
};

const HL_STYLE =
  "::highlight(al-existing){background-color:#fcd34d;color:#111}::highlight(al-pending){background-color:#34d399;color:#111}";

type Notice = { kind: "ok" | "err"; text: string } | null;

export default function PageLinksManager() {
  const [path, setPath] = useState("/");
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [blogs, setBlogs] = useState<BlogOption[]>([]);
  const [tab, setTab] = useState<"text" | "related">("text");

  const [links, setLinks] = useState<TextLink[]>([]);
  const [allLinks, setAllLinks] = useState<TextLink[]>([]);
  const [related, setRelated] = useState<RelatedLink[]>([]);

  // add form
  const [blogSlug, setBlogSlug] = useState("");
  const [url, setUrl] = useState("");
  const [newTab, setNewTab] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [occurrence, setOccurrence] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // changing a link that already exists in the page
  const [anchors, setAnchors] = useState<AnchorInfo[]>([]);
  const [target, setTarget] = useState<{ text: string; n: number; href: string } | null>(null);
  const [eBlog, setEBlog] = useState("");
  const [eUrl, setEUrl] = useState("");
  const [eText, setEText] = useState("");
  const [eTab, setETab] = useState(false);
  const [eRemove, setERemove] = useState(false);

  // editing
  const [repickId, setRepickId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [editNewTab, setEditNewTab] = useState(false);

  // preview
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameTick, setFrameTick] = useState(0);
  const [frameLoading, setFrameLoading] = useState(true);
  const [mentions, setMentions] = useState<DomMention[]>([]);
  const [found, setFound] = useState<Record<string, boolean>>({});
  const timers = useRef<number[]>([]);
  const repickRef = useRef<string | null>(null);
  repickRef.current = repickId;

  const serviceSlug = path.startsWith("/services/") ? path.split("/")[2] : "";

  /* ---------- loading ---------- */
  const loadLinks = useCallback(async () => {
    const [mine, all] = await Promise.all([
      fetch(`/api/seopanel/page-links?path=${encodeURIComponent(path)}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/seopanel/page-links", { credentials: "include" }).then((r) => r.json()),
    ]);
    if (mine.success) setLinks(mine.links);
    if (all.success) setAllLinks(all.links);
  }, [path]);

  const loadRelated = useCallback(async () => {
    if (!serviceSlug) { setRelated([]); return; }
    const r = await fetch(`/api/seopanel/service-links?serviceSlug=${encodeURIComponent(serviceSlug)}`, { credentials: "include" }).then((x) => x.json());
    if (r.success) setRelated(r.links);
  }, [serviceSlug]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("path");
    if (q) setPath(normPath(q));
    (async () => {
      const [p, b] = await Promise.all([
        fetch("/api/seopanel/pages", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/seopanel/blog", { credentials: "include" }).then((r) => r.json()),
      ]);
      if (p.success) setPages(p.pages.map((x: { path: string; pageLabel?: string }) => ({ path: x.path, label: x.pageLabel || x.path })));
      if (b.success) setBlogs(b.posts.map((x: BlogOption) => ({ slug: x.slug, title: x.title, status: x.status })));
    })();
  }, []);

  useEffect(() => { loadLinks(); loadRelated(); }, [loadLinks, loadRelated]);

  useEffect(() => {
    setPhrase(""); setOccurrence(1); setRepickId(null); setEditId(null); setNotice(null); setFrameLoading(true);
    if (!path.startsWith("/services/")) setTab("text");
  }, [path]);

  /* ---------- preview iframe ---------- */
  const doc = () => frameRef.current?.contentDocument ?? null;

  const bump = () => setFrameTick((t) => t + 1);

  const onFrameLoad = () => {
    setFrameLoading(false);
    const d = doc();
    if (!d) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [900, 2500, 5000].map((ms) => window.setTimeout(bump, ms));
    bump();
    d.addEventListener("click", (e) => {
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a) return;
      e.preventDefault(); // stay on this page while picking
      const hit = locateAnchors(getScope(d)).find((x) => x.el === a);
      if (hit) onAnchorRef.current(hit);
    }, true);
    d.addEventListener("mouseup", () => onSelectRef.current());
    d.addEventListener("touchend", () => window.setTimeout(() => onSelectRef.current(), 50));
  };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const d = doc();
    if (!d || !phrase.trim()) { setMentions([]); return; }
    setMentions(locateMentions(getScope(d), phrase));
  }, [phrase, frameTick]);

  const chosen = mentions.find((m) => m.n === occurrence) ?? null;

  // Highlights in the preview: gold = saved links, green = the spot you are choosing (no page changes).
  useEffect(() => {
    const d = doc();
    const win = frameRef.current?.contentWindow as (Window & { Highlight?: new (...r: Range[]) => unknown; CSS?: { highlights?: Map<string, unknown> } }) | null;
    if (!d || !win) return;
    const scope = getScope(d);
    if (!scope) return; // preview page is still loading
    const status: Record<string, boolean> = {};
    const existing: Range[] = [];
    const foundAnchors = locateAnchors(scope);
    setAnchors(foundAnchors);
    // Preview only: links you removed look like plain text (the real <a> stays so word counting stays exact).
    scope.querySelectorAll<HTMLElement>("[data-al-sim]").forEach((el) => {
      el.removeAttribute("data-al-sim");
      ["color", "text-decoration", "font-weight", "cursor"].forEach((pr) => el.style.removeProperty(pr));
    });
    for (const l of links) {
      if (l.kind === "edit") {
        const a = foundAnchors.find((x) => x.text.toLowerCase() === l.phrase.replace(/\s+/g, " ").trim().toLowerCase() && x.n === l.occurrence);
        status[l.id] = !!a;
        if (a && l.isActive) {
          if (!l.removeLink) { const r = d.createRange(); r.selectNodeContents(a.el); existing.push(r); } // removed links look like plain text, no marker
          if (l.removeLink) {
            a.el.setAttribute("data-al-sim", "1");
            a.el.style.setProperty("color", "inherit", "important");
            a.el.style.setProperty("text-decoration", "none", "important");
            a.el.style.setProperty("font-weight", "inherit", "important");
          }
        }
        continue;
      }
      const hit = locateMentions(scope, l.phrase).find((m) => m.n === l.occurrence);
      status[l.id] = !!hit;
      if (hit && l.isActive) {
        const r = d.createRange(); r.setStart(hit.node, hit.start); r.setEnd(hit.node, hit.end); existing.push(r);
      }
    }
    setFound(status);
    try {
      if (!d.getElementById("al-hl-style")) {
        const st = d.createElement("style"); st.id = "al-hl-style"; st.textContent = HL_STYLE; d.head.appendChild(st);
      }
      const hl = win.CSS?.highlights;
      if (hl && win.Highlight) {
        hl.set("al-existing", new win.Highlight(...existing));
        const pending: Range[] = [];
        if (tab === "text" && chosen) {
          const r = d.createRange(); r.setStart(chosen.node, chosen.start); r.setEnd(chosen.node, chosen.end); pending.push(r);
        }
        if (tab === "text" && target) {
          const a = foundAnchors.find((x) => x.text === target.text && x.n === target.n);
          if (a) { const r = d.createRange(); r.selectNodeContents(a.el); pending.push(r); }
        }
        hl.set("al-pending", new win.Highlight(...pending));
      }
    } catch { /* highlighting is a visual aid only */ }
  }, [links, chosen, target, tab, frameTick]);

  const scrollTo = (m: DomMention) => {
    m.node.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  /* ---------- selecting a word in the preview ---------- */
  const onAnchorRef = useRef<(a: AnchorInfo) => void>(() => {});
  const onSelectRef = useRef<() => void>(() => {});
  onAnchorRef.current = (a: AnchorInfo) => chooseAnchor(a);
  onSelectRef.current = async () => {
    const d = doc();
    const sel = d?.getSelection();
    if (!d || !sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0);
    // Selecting text that is (or starts/ends inside) an existing link opens that link for editing.
    const insideAnchor = (n: Node) => {
      const el = n.nodeType === 1 ? (n as Element) : n.parentElement;
      return (el?.closest("a[href]") as HTMLElement | null) ?? null;
    };
    const touched = [insideAnchor(r.startContainer), insideAnchor(r.endContainer)].filter(Boolean);
    if (touched.length) {
      const hit = locateAnchors(getScope(d)).find((x) => touched.includes(x.el));
      if (hit) {
        sel.removeAllRanges();
        chooseAnchor(hit);
        return;
      }
    }
    if (r.startContainer.nodeType !== 3 || r.startContainer !== r.endContainer) {
      setNotice({ kind: "err", text: "Select words inside a single paragraph or heading (not across a link, button or line break)." });
      return;
    }
    const node = r.startContainer as Text;
    const scope = getScope(d);
    if (!textNodesIn(scope).includes(node)) {
      setNotice({ kind: "err", text: "That text can't be linked (menu, footer, button, or it is already a link)." });
      return;
    }
    const text = node.nodeValue ?? "";
    let start = r.startOffset;
    let end = r.endOffset;
    const isWord = (c?: string) => !!c && /[\p{L}\p{N}]/u.test(c);
    while (start > 0 && isWord(text[start - 1]) && isWord(text[start])) start--;
    while (end < text.length && isWord(text[end]) && isWord(text[end - 1])) end++;
    const picked = text.slice(start, end).replace(/\s+/g, " ").trim();
    if (!picked) return;
    const hit = locateMentions(scope, picked).find((m) => m.node === node && m.start === start);
    const n = hit?.n ?? 1;
    sel.removeAllRanges();

    if (repickRef.current) {
      const id = repickRef.current;
      setRepickId(null);
      await patchText(id, { phrase: picked, occurrence: n });
      setNotice({ kind: "ok", text: `Link moved to "${picked}" (mention #${n}).` });
      return;
    }
    setPhrase(picked);
    setOccurrence(n);
    setNotice(null);
  };

  /* ---------- actions: links that already exist in the page ---------- */
  const existingEdit = (text: string, n: number) =>
    links.find((l) => l.kind === "edit" && l.phrase.toLowerCase() === text.toLowerCase() && l.occurrence === n);

  const chooseAnchor = (a: { text: string; n: number; href: string }) => {
    const prior = existingEdit(a.text, a.n);
    setTarget({ text: a.text, n: a.n, href: a.href });
    setPhrase(""); setOccurrence(1); setRepickId(null); setEditId(null);
    setEUrl(prior?.url ?? a.href); setEText(prior?.newText ?? ""); setETab(prior?.newTab ?? false); setERemove(prior?.removeLink ?? false); setEBlog("");
    setNotice(null);
  };

  const saveExisting = async () => {
    if (!target) return;
    setBusy(true); setNotice(null);
    const prior = existingEdit(target.text, target.n);
    const body = { phrase: target.text, occurrence: target.n, url: eRemove ? "" : eUrl, newText: eText, newTab: eTab, removeLink: eRemove };
    const res = prior
      ? await fetch(`/api/seopanel/page-links/${prior.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/seopanel/page-links", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, pagePath: path, kind: "edit" }) });
    const data = await res.json();
    if (!data.success) setNotice({ kind: "err", text: data.error || "Could not save" });
    else { setNotice({ kind: "ok", text: eRemove ? `"${target.text}" is no longer a link.` : `"${target.text}" now links to ${eUrl}. It is live on the page.` }); setTarget(null); await loadLinks(); }
    setBusy(false);
  };

  /* ---------- actions: text links ---------- */
  const pickBlog = (slug: string) => {
    setBlogSlug(slug);
    const post = blogs.find((b) => b.slug === slug);
    if (post) setUrl(`/news/${post.slug}`);
  };

  const canAdd = !!url.trim() && !!phrase.trim() && !!chosen;

  const addText = async () => {
    setBusy(true); setNotice(null);
    const res = await fetch("/api/seopanel/page-links", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pagePath: path, phrase, url, occurrence, newTab }),
    });
    const data = await res.json();
    if (!data.success) setNotice({ kind: "err", text: data.error || "Could not add the link" });
    else {
      setNotice({ kind: "ok", text: `"${phrase}" now links to ${url}. It is live on the page.` });
      setPhrase(""); setOccurrence(1);
      await loadLinks();
    }
    setBusy(false);
  };

  async function patchText(id: string, body: Partial<TextLink>) {
    const res = await fetch(`/api/seopanel/page-links/${id}`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) setNotice({ kind: "err", text: data.error || "Could not save" });
    await loadLinks();
    return data.success as boolean;
  }

  const removeText = async (l: TextLink) => {
    if (!confirm(l.kind === "edit" ? `Undo your change to "${l.phrase}" and restore the original link?` : `Remove the link on "${l.phrase}"?`)) return;
    await fetch(`/api/seopanel/page-links/${l.id}`, { method: "DELETE", credentials: "include" });
    await loadLinks();
  };

  const startEdit = (l: TextLink) => { setEditId(l.id); setEditUrl(l.url); setEditNewTab(l.newTab); setRepickId(null); };
  const saveEdit = async (l: TextLink) => {
    const ok = await patchText(l.id, { url: editUrl, newTab: editNewTab });
    if (ok) { setEditId(null); setNotice({ kind: "ok", text: "Link updated." }); }
  };

  /* ---------- actions: related list ---------- */
  const [rLabel, setRLabel] = useState("");
  const [rUrl, setRUrl] = useState("");
  const [rEditId, setREditId] = useState<string | null>(null);
  const [rEditLabel, setREditLabel] = useState("");
  const [rEditUrl, setREditUrl] = useState("");

  const addRelated = async () => {
    setBusy(true); setNotice(null);
    const res = await fetch("/api/seopanel/service-links", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceSlug, label: rLabel, url: rUrl }),
    });
    const data = await res.json();
    if (!data.success) setNotice({ kind: "err", text: data.error || "Could not add" });
    else { setRLabel(""); setRUrl(""); setBlogSlug(""); setNotice({ kind: "ok", text: "Added to Related Guides." }); await loadRelated(); }
    setBusy(false);
  };
  const patchRelated = async (id: string, body: Partial<RelatedLink>) => {
    await fetch(`/api/seopanel/service-links/${id}`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    await loadRelated();
  };
  const removeRelated = async (l: RelatedLink) => {
    if (!confirm(`Remove "${l.label}" from Related Guides?`)) return;
    await fetch(`/api/seopanel/service-links/${l.id}`, { method: "DELETE", credentials: "include" });
    await loadRelated();
  };
  const moveRelated = async (i: number, dir: -1 | 1) => {
    const a = related[i]; const b = related[i + dir];
    if (!a || !b) return;
    await Promise.all([patchRelated(a.id, { sortOrder: i + dir }), patchRelated(b.id, { sortOrder: i })]);
  };

  /* ---------- render helpers ---------- */
  const pageOptions = useMemo(() => {
    const list = [...pages];
    if (!list.some((p) => p.path === path)) list.unshift({ path, label: path });
    return list.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
  }, [pages, path]);

  const snippet = (m: DomMention) => {
    const t = m.node.nodeValue ?? "";
    const from = Math.max(0, m.start - 45);
    const to = Math.min(t.length, m.end + 45);
    return (<>{from > 0 ? "…" : ""}{t.slice(from, m.start)}<strong className="bg-emerald-100 text-emerald-900 px-0.5 rounded">{t.slice(m.start, m.end)}</strong>{t.slice(m.end, to)}{to < t.length ? "…" : ""}</>);
  };

  const groupedAll = useMemo(() => {
    const map = new Map<string, TextLink[]>();
    for (const l of allLinks) map.set(l.pagePath, [...(map.get(l.pagePath) ?? []), l]);
    return [...map.entries()];
  }, [allLinks]);

  const step = (n: number, text: string) => (
    <h3 className="text-sm font-bold text-gray-900">
      <span className="inline-flex w-6 h-6 rounded-full bg-emerald-600 text-white text-xs items-center justify-center mr-2">{n}</span>{text}
    </h3>
  );

  return (
    <div className="space-y-6 text-gray-900">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Page Links</h1>
        <p className="text-gray-600 text-sm mt-1">
          Turn any word in the body of any page (between the header and the footer) into a link. Pick the page, highlight the word in the preview, choose where it should go.
        </p>
      </div>

      {/* page picker */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <label className="text-sm font-semibold text-gray-900 shrink-0">Page</label>
        <select className={field} value={path} onChange={(e) => setPath(normPath(e.target.value))}>
          {pageOptions.map((p) => (<option key={p.path} value={p.path}>{p.label === p.path ? p.path : `${p.label}  —  ${p.path}`}</option>))}
        </select>
        <a href={path} target="_blank" rel="noopener" className={`${btnGhost} shrink-0`}><ExternalLink className="w-3.5 h-3.5" />Open live page</a>
      </div>

      {serviceSlug && (
        <div className="flex gap-2">
          <button onClick={() => setTab("text")} className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 ${tab === "text" ? "border-emerald-600 bg-emerald-50 text-gray-900" : "border-gray-200 bg-white text-gray-700"}`}>
            <MousePointerClick className="w-4 h-4 inline mr-1.5" />Links on words
          </button>
          <button onClick={() => setTab("related")} className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 ${tab === "related" ? "border-emerald-600 bg-emerald-50 text-gray-900" : "border-gray-200 bg-white text-gray-700"}`}>
            <ListPlus className="w-4 h-4 inline mr-1.5" />Related Guides list
          </button>
        </div>
      )}

      {notice && (
        <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${notice.kind === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-800"}`}>
          {notice.kind === "ok" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {notice.text}
        </div>
      )}

      {tab === "text" ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
            {/* preview */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-700">
                <span className="font-semibold text-gray-900">Live preview of {path}</span>
                <span className="inline-flex items-center gap-1"><mark className="bg-amber-300 text-black rounded px-1">gold</mark> already linked</span>
                <span className="inline-flex items-center gap-1"><mark className="bg-emerald-400 text-black rounded px-1">green</mark> your choice</span>
                <span>Menu, footer and buttons can&apos;t be linked.</span>
                <span className="w-full text-gray-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  This preview always shows the page <strong>as originally written</strong>, so a link you removed is shown as plain text, and a changed address is only visible on the live page. Links with a changed address are marked <mark className="bg-amber-300 text-black rounded px-1">gold</mark>. Use <strong>Open live page</strong> to see the real result.
                </span>
              </div>
              <div className="relative">
                {frameLoading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10"><Loader2 className="w-7 h-7 animate-spin text-emerald-600" /></div>}
                <iframe
                  key={path}
                  ref={frameRef}
                  src={`${path}${path.includes("?") ? "&" : "?"}autolink=off`}
                  onLoad={onFrameLoad}
                  title="Page preview"
                  className="w-full h-[640px] bg-white"
                />
              </div>
            </div>

            {/* controls */}
            <div className="space-y-5 xl:sticky xl:top-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
                {repickId && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-sm px-3 py-2">
                    <Crosshair className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="flex-1">Now highlight the new word in the preview to move this link there.</span>
                    <button onClick={() => setRepickId(null)} className="underline text-xs font-semibold">Cancel</button>
                  </div>
                )}
                {target ? (
                  <section className="space-y-2 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-gray-900">Change an existing link</h3>
                      <button onClick={() => setTarget(null)} className="text-xs font-semibold text-gray-700 underline">Close</button>
                    </div>
                    <p className="text-sm text-gray-800">Link text: <strong>&quot;{target.text}&quot;</strong> <span className="text-gray-600">(link #{target.n} with this text)</span></p>
                    <p className="text-xs text-gray-600 font-mono break-all">Currently goes to: {target.href}</p>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-900"><input type="checkbox" className="rounded" checked={eRemove} onChange={(e) => setERemove(e.target.checked)} />Remove the link (keep the text)</label>
                    {!eRemove && (
                      <>
                        <select className={field} value={eBlog} onChange={(e) => { setEBlog(e.target.value); if (e.target.value) setEUrl(`/news/${e.target.value}`); }}>
                          <option value="">Pick a blog post…</option>
                          {blogs.map((b) => (<option key={b.slug} value={b.slug}>{b.title}{b.status !== "published" ? ` (${b.status})` : ""}</option>))}
                        </select>
                        <input className={`${field} font-mono`} placeholder="New address: /contact or https://…" value={eUrl} onChange={(e) => { setEUrl(e.target.value); setEBlog(""); }} />
                        <input className={field} placeholder="New link text (optional, leave empty to keep it)" value={eText} onChange={(e) => setEText(e.target.value)} />
                        <label className="flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" className="rounded" checked={eTab} onChange={(e) => setETab(e.target.checked)} />Open in a new tab</label>
                      </>
                    )}
                    <div className="flex gap-2">
                      <button className={btnPrimary} disabled={busy || (!eRemove && !eUrl.trim())} onClick={saveExisting}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save change</button>
                      <button className={btnGhost} onClick={() => setTarget(null)}>Cancel</button>
                    </div>
                  </section>
                ) : (
                  <p className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <strong>To change a link that is already on the page</strong>, click it or select its text in the preview, or choose it from the list below.
                  </p>
                )}

                <section className="space-y-2">
                  {step(1, "Highlight a word in the preview")}
                  <p className="text-xs text-gray-600">Drag across the word or phrase on the left. It snaps to whole words. Or type it here:</p>
                  <input className={field} placeholder="Selected word or phrase" value={phrase} onChange={(e) => { setPhrase(e.target.value); setOccurrence(1); }} />
                  {phrase.trim() && (mentions.length === 0 ? (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">&quot;{phrase}&quot; was not found in the page body. Check the spelling or select it in the preview.</p>
                  ) : (
                    <div className="rounded-xl border border-gray-200">
                      <p className="px-3 py-2 text-sm font-semibold text-gray-900 border-b border-gray-100 bg-gray-50 rounded-t-xl">
                        Found {mentions.length} time{mentions.length > 1 ? "s" : ""}. Which one gets the link?
                      </p>
                      <ul className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
                        {mentions.map((m) => (
                          <li key={m.n}>
                            <label className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer ${occurrence === m.n ? "bg-emerald-50" : "hover:bg-gray-50"}`}>
                              <input type="radio" name="mention" className="mt-1" checked={occurrence === m.n} onChange={() => { setOccurrence(m.n); scrollTo(m); }} />
                              <span className="text-xs text-gray-800 leading-relaxed"><span className="font-bold text-emerald-700">#{m.n}</span> {snippet(m)}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>

                <section className="space-y-2">
                  {step(2, "Where should it link to?")}
                  <select className={field} value={blogSlug} onChange={(e) => pickBlog(e.target.value)}>
                    <option value="">Choose a blog post…</option>
                    {blogs.map((b) => (<option key={b.slug} value={b.slug}>{b.title}{b.status !== "published" ? ` (${b.status})` : ""}</option>))}
                  </select>
                  <input className={`${field} font-mono`} placeholder="…or any page: /contact or https://…" value={url} onChange={(e) => { setUrl(e.target.value); setBlogSlug(""); }} />
                  <label className="flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" className="rounded" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />Open in a new tab</label>
                </section>

                <button onClick={addText} disabled={busy || !canAdd} className={`${btnPrimary} w-full justify-center`}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add link
                </button>

                <section className="space-y-2 pt-1 border-t border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Links already written in this page ({anchors.length})</h3>
                  {anchors.length === 0 ? <p className="text-xs text-gray-600">None found in the body text.</p> : (
                    <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl max-h-60 overflow-y-auto">
                      {anchors.map((a, i) => {
                        const ed = existingEdit(a.text, a.n);
                        return (
                          <li key={i} className="flex items-center gap-2 px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">&quot;{a.text}&quot;{ed && <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">changed</span>}</p>
                              <p className="text-xs font-mono text-gray-600 truncate">→ {a.href}</p>
                            </div>
                            <button className={btnGhost} onClick={() => { a.el.scrollIntoView({ block: "center", behavior: "smooth" }); chooseAnchor(a); }}><Pencil className="w-3.5 h-3.5" />Change</button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          </div>

          {/* existing on this page */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-base font-bold text-gray-900">Links on this page ({links.length})</h2>
            {links.length === 0 ? <p className="text-sm text-gray-600">No text links on this page yet.</p> : (
              <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
                {links.map((l) => (
                  <li key={l.id} className="px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-sm font-semibold text-gray-900">
                          &quot;{l.phrase}&quot;
                          <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">{l.kind === "edit" ? `existing link #${l.occurrence} changed` : `mention #${l.occurrence}`}</span>
                          {found[l.id] === false && <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">not found on page</span>}
                        </p>
                        <p className="text-xs font-mono text-gray-600 break-all">{l.kind === "edit" && l.removeLink ? "link removed, text kept" : `→ ${l.url}${l.newTab ? "  (new tab)" : ""}${l.newText ? `  · text: "${l.newText}"` : ""}`}</p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-gray-700"><input type="checkbox" className="rounded" checked={l.isActive} onChange={(e) => patchText(l.id, { isActive: e.target.checked })} />Show</label>
                      <button className={btnGhost} onClick={() => {
                        const d = doc(); if (!d) return;
                        if (l.kind === "edit") { anchors.find((x) => x.text.toLowerCase() === l.phrase.toLowerCase() && x.n === l.occurrence)?.el.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
                        const m = locateMentions(getScope(d), l.phrase).find((x) => x.n === l.occurrence); if (m) scrollTo(m);
                      }}>Show in page</button>
                      {l.kind === "edit" ? (
                        <button className={btnGhost} onClick={() => { const a = anchors.find((x) => x.text.toLowerCase() === l.phrase.toLowerCase() && x.n === l.occurrence); if (a) { a.el.scrollIntoView({ block: "center", behavior: "smooth" }); chooseAnchor(a); window.scrollTo({ top: 0, behavior: "smooth" }); } }}><Pencil className="w-3.5 h-3.5" />Edit</button>
                      ) : (
                        <>
                          <button className={btnGhost} onClick={() => { setRepickId(l.id); setEditId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Crosshair className="w-3.5 h-3.5" />Move to another word</button>
                          <button className={btnGhost} onClick={() => (editId === l.id ? setEditId(null) : startEdit(l))}><Pencil className="w-3.5 h-3.5" />Edit link</button>
                        </>
                      )}
                      <button onClick={() => removeText(l)} className="p-2 hover:bg-red-50 rounded-lg text-red-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {editId === l.id && (
                      <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
                        <select className={field} value="" onChange={(e) => e.target.value && setEditUrl(`/news/${e.target.value}`)}>
                          <option value="">Pick a blog post to link to instead…</option>
                          {blogs.map((b) => (<option key={b.slug} value={b.slug}>{b.title}</option>))}
                        </select>
                        <input className={`${field} font-mono`} value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                        <label className="flex items-center gap-2 text-sm text-gray-800"><input type="checkbox" className="rounded" checked={editNewTab} onChange={(e) => setEditNewTab(e.target.checked)} />Open in a new tab</label>
                        <div className="flex gap-2">
                          <button className={btnPrimary} onClick={() => saveEdit(l)}><Save className="w-4 h-4" />Save</button>
                          <button className={btnGhost} onClick={() => setEditId(null)}><X className="w-3.5 h-3.5" />Cancel</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <p className="text-sm text-gray-700">These appear as a &quot;Related Guides and Resources&quot; list near the bottom of the service page.</p>
          <div className="rounded-xl border border-gray-200 p-4 space-y-2 bg-gray-50">
            <select className={field} value={blogSlug} onChange={(e) => { setBlogSlug(e.target.value); const b = blogs.find((x) => x.slug === e.target.value); if (b) { setRUrl(`/news/${b.slug}`); if (!rLabel) setRLabel(b.title); } }}>
              <option value="">Choose a blog post…</option>
              {blogs.map((b) => (<option key={b.slug} value={b.slug}>{b.title}{b.status !== "published" ? ` (${b.status})` : ""}</option>))}
            </select>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input className={field} placeholder="Link text shown to visitors" value={rLabel} onChange={(e) => setRLabel(e.target.value)} />
              <input className={`${field} font-mono`} placeholder="/news/slug or https://…" value={rUrl} onChange={(e) => { setRUrl(e.target.value); setBlogSlug(""); }} />
            </div>
            <button className={btnPrimary} disabled={busy || !rLabel.trim() || !rUrl.trim()} onClick={addRelated}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add to list</button>
          </div>
          {related.length === 0 ? <p className="text-sm text-gray-600">Nothing in the list yet.</p> : (
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
              {related.map((l, i) => (
                <li key={l.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button disabled={i === 0} onClick={() => moveRelated(i, -1)} className="p-0.5 text-gray-500 hover:text-gray-900 disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button disabled={i === related.length - 1} onClick={() => moveRelated(i, 1)} className="p-0.5 text-gray-500 hover:text-gray-900 disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{l.label}</p>
                      <p className="text-xs font-mono text-gray-600 truncate">→ {l.url}</p>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700"><input type="checkbox" className="rounded" checked={l.isActive} onChange={(e) => patchRelated(l.id, { isActive: e.target.checked })} />Show</label>
                    <button className={btnGhost} onClick={() => { setREditId(rEditId === l.id ? null : l.id); setREditLabel(l.label); setREditUrl(l.url); }}><Pencil className="w-3.5 h-3.5" />Edit</button>
                    <button onClick={() => removeRelated(l)} className="p-2 hover:bg-red-50 rounded-lg text-red-600" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {rEditId === l.id && (
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 space-y-2">
                      <input className={field} value={rEditLabel} onChange={(e) => setREditLabel(e.target.value)} />
                      <input className={`${field} font-mono`} value={rEditUrl} onChange={(e) => setREditUrl(e.target.value)} />
                      <div className="flex gap-2">
                        <button className={btnPrimary} onClick={async () => { await patchRelated(l.id, { label: rEditLabel, url: rEditUrl }); setREditId(null); }}><Save className="w-4 h-4" />Save</button>
                        <button className={btnGhost} onClick={() => setREditId(null)}><X className="w-3.5 h-3.5" />Cancel</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* overview */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-base font-bold text-gray-900">All text links on the site ({allLinks.length})</h2>
        {groupedAll.length === 0 ? <p className="text-sm text-gray-600">No links yet.</p> : (
          <div className="space-y-4">
            {groupedAll.map(([p, items]) => (
              <div key={p}>
                <button onClick={() => { setTab("text"); setPath(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-sm font-semibold text-emerald-700 hover:underline font-mono">{p}</button>
                <ul className="mt-1 text-sm text-gray-800 space-y-0.5">
                  {items.map((l) => (
                    <li key={l.id}>&quot;{l.phrase}&quot; <span className="text-gray-500">#{l.occurrence}</span> → <span className="font-mono text-xs">{l.url}</span>{!l.isActive && <span className="ml-2 text-xs text-gray-500">(hidden)</span>}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
