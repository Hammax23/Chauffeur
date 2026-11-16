/**
 * Shared by the public site (applies links) and the SEO panel preview (finds/highlights words), so
 * "mention #3 of a phrase" means exactly the same thing in both places.
 * Counting runs over the visible page body (<main>, falling back to <body>), skipping header, nav,
 * footer, buttons, existing links, scripts and anything marked data-autolink-skip.
 */

const SKIP =
  "a:not([data-autolink]), button, script, style, noscript, textarea, input, select, svg, iframe, nav, header, footer, [data-autolink-skip], [data-al-removed], [contenteditable='true']";

/** Places that can never hold a link (used when looking for existing links to edit). */
const SKIP_CONTEXT =
  "button, script, style, noscript, textarea, input, select, svg, iframe, nav, header, footer, [data-autolink-skip], [contenteditable='true']";

export interface DomMention {
  node: Text;
  start: number;
  end: number;
  /** 1-based number of this mention across the page body, in reading order */
  n: number;
}

export interface LinkToApply {
  id: string;
  phrase: string;
  url: string;
  occurrence: number;
  newTab?: boolean;
  /** "edit" changes a link that already exists in the page (phrase = its current text) */
  kind?: string;
  removeLink?: boolean;
  newText?: string | null;
}

export interface AnchorInfo {
  el: HTMLElement;
  /** original text of the link, whitespace collapsed */
  text: string;
  /** which link with this text it is (1 = first), in reading order */
  n: number;
  href: string;
}

const normText = (t: string) => t.replace(/\s+/g, " ").trim();

/** Links that already exist in the page body (written in the code), in reading order. */
export function locateAnchors(root: Element | null): AnchorInfo[] {
  if (!root) return [];
  const out: AnchorInfo[] = [];
  const counts = new Map<string, number>();
  root.querySelectorAll<HTMLElement>("a[href]:not([data-autolink]), span[data-al-removed]").forEach((el) => {
    if (el.parentElement?.closest(SKIP_CONTEXT)) return;
    const text = normText(el.getAttribute("data-al-orig") ?? el.textContent ?? "");
    if (!text) return;
    const key = text.toLowerCase();
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    out.push({ el, text, n, href: el.getAttribute("data-al-href") ?? el.getAttribute("href") ?? "" });
  });
  return out;
}

/** The page body to work on, or null while the document is still loading. */
export function getScope(doc: Document): HTMLElement | null {
  return (doc.querySelector("main") as HTMLElement | null) ?? doc.body ?? null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function mentionRegex(phrase: string): RegExp | null {
  const words = phrase.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const body = words.map(escapeRegExp).join("\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "giu");
}

/** Text nodes that can hold a link, in reading order. Text already inside one of our links is kept (and counted). */
export function textNodesIn(root: Element | null): Text[] {
  if (!root) return [];
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */);
  const out: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n as Text;
    if (!t.nodeValue || !t.nodeValue.trim()) continue;
    const parent = t.parentElement;
    if (!parent || parent.closest(SKIP)) continue;
    out.push(t);
  }
  return out;
}

/** Every mention of `phrase` in the page body, numbered in reading order. */
export function locateMentions(root: Element | null, phrase: string): DomMention[] {
  if (!root) return [];
  const re = mentionRegex(phrase);
  if (!re) return [];
  const out: DomMention[] = [];
  let n = 0;
  for (const node of textNodesIn(root)) {
    const text = node.nodeValue ?? "";
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      n += 1;
      out.push({ node, start: m.index, end: m.index + m[0].length, n });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return out;
}

/** Changes links that already exist in the page: new URL / text / tab, or unlink (keeping the text). */
function applyEdits(root: Element, edits: LinkToApply[]): Set<string> {
  const applied = new Set<string>();
  const doc = root.ownerDocument;
  for (const e of edits) {
    const key = normText(e.phrase).toLowerCase();
    const target = locateAnchors(root).find((a) => a.text.toLowerCase() === key && a.n === e.occurrence);
    if (!target || target.el.tagName !== "A") continue;
    const el = target.el;
    el.setAttribute("data-al-orig", target.text);
    el.setAttribute("data-al-href", target.href);
    if (e.removeLink) {
      const span = doc.createElement("span");
      span.setAttribute("data-al-removed", e.id);
      span.setAttribute("data-al-orig", target.text);
      span.setAttribute("data-al-href", target.href);
      // plain text: drop the link styling (colour, bold, underline, hover) so it no longer looks like a link
      span.className = "";
      while (el.firstChild) span.appendChild(el.firstChild);
      if (e.newText) span.textContent = e.newText;
      el.replaceWith(span);
    } else {
      el.setAttribute("href", e.url);
      el.setAttribute("data-al-edit", e.id);
      if (e.newTab || /^https?:\/\//i.test(e.url)) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      } else {
        el.removeAttribute("target");
      }
      if (e.newText) el.textContent = e.newText;
    }
    applied.add(e.id);
  }
  return applied;
}

/** Applies panel links: wraps the chosen mention of each word in an <a>, and edits existing links. Returns applied ids. */
export function applyLinks(root: Element | null, all: LinkToApply[]): Set<string> {
  if (!root) return new Set();
  const applied = applyEdits(root, all.filter((l) => l.kind === "edit"));
  const links = all.filter((l) => l.kind !== "edit");
  if (!links.length) return applied;
  const doc = root.ownerDocument;

  const groups = new Map<string, LinkToApply[]>();
  for (const l of links) {
    const key = l.phrase.trim().replace(/\s+/g, " ").toLowerCase();
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }

  const plan = new Map<Text, { start: number; end: number; link: LinkToApply }[]>();
  for (const group of groups.values()) {
    for (const m of locateMentions(root, group[0].phrase)) {
      for (const l of group) {
        if (l.occurrence === m.n) {
          // text already wrapped by one of our links can't be wrapped again
          if (m.node.parentElement?.closest("a[data-autolink]")) continue;
          plan.set(m.node, [...(plan.get(m.node) ?? []), { start: m.start, end: m.end, link: l }]);
        }
      }
    }
  }

  for (const [node, items] of plan) {
    items.sort((a, b) => b.start - a.start); // last first, so earlier offsets stay valid
    let limit = Infinity;
    for (const it of items) {
      if (it.end > limit) continue; // overlapping phrases: keep the later-starting one only once
      const mid = node.splitText(it.start);
      mid.splitText(it.end - it.start);
      const a = doc.createElement("a");
      a.href = it.link.url;
      a.setAttribute("data-autolink", it.link.id);
      a.style.color = "#C9A063";
      a.style.textDecoration = "underline";
      a.style.textUnderlineOffset = "3px";
      if (it.link.newTab || /^https?:\/\//i.test(it.link.url)) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      mid.parentNode?.replaceChild(a, mid);
      a.appendChild(mid);
      applied.add(it.link.id);
      limit = it.start;
    }
  }
  return applied;
}
