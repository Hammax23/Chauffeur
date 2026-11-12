"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { applyLinks, getScope, type LinkToApply } from "@/lib/autolink-dom";

interface Props {
  links: (LinkToApply & { pagePath: string })[];
}

function norm(p: string): string {
  const x = (p || "/").split("#")[0].split("?")[0].replace(/\/+$/, "");
  return x || "/";
}

/** Applies the text links managed in the SEO panel (Page Links) to the current page's body text. */
export default function PageTextLinks({ links }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autolink") === "off") return;
    const mine = links.filter((l) => norm(l.pagePath) === norm(pathname));
    if (!mine.length) return;

    const done = new Set<string>();
    const run = () => {
      const pending = mine.filter((l) => !done.has(l.id));
      if (!pending.length) return;
      applyLinks(getScope(document), pending).forEach((id) => done.add(id));
    };

    // Wait until the page has hydrated, then retry for content that appears a little later.
    const timers = [500, 1500, 3500].map((ms) => window.setTimeout(run, ms));

    // Internal links keep the single-page navigation instead of a full reload.
    // Links edited here were rendered by the page with their old address, so take the click over (capture phase).
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[data-autolink], a[data-al-edit]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const href = a.getAttribute("href") || "";
      e.preventDefault();
      e.stopPropagation();
      if (a.target === "_blank") window.open(href, "_blank", "noopener");
      else if (href.startsWith("/")) router.push(href);
      else window.location.href = href;
    };
    document.addEventListener("click", onClick, true);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname, links, router]);

  return null;
}
