"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type ExtrasPage = {
  path: string;
  h1: string | null;
  breadcrumbLabel: string | null;
  schemaJson: unknown;
  headerScripts: string | null;
  bodyScripts: string | null;
  bodyContentHtml: string | null;
  bodyContentPosition: string;
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function fetchExtras(path: string): Promise<ExtrasPage | null> {
  try {
    const res = await fetch(`/api/seo/page-extras?path=${encodeURIComponent(path)}`, {
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page ?? null;
  } catch {
    return null;
  }
}

/** Injects per-page JSON-LD + header scripts; updates on client navigations. */
export function SeoPageHeadLive() {
  const pathname = usePathname();
  const path = normalizePath(pathname || "/");

  useEffect(() => {
    if (path.startsWith("/seopanel") || path.startsWith("/admin") || path.startsWith("/api")) {
      return;
    }

    let cancelled = false;
    const marker = "data-seo-page-head";

    document.querySelectorAll(`[${marker}]`).forEach((el) => el.remove());

    void (async () => {
      const page = await fetchExtras(path);
      if (cancelled || !page) return;

      if (page.schemaJson != null) {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute(marker, "1");
        script.text = JSON.stringify(page.schemaJson);
        document.head.appendChild(script);
      }

      if (page.headerScripts?.trim()) {
        const wrap = document.createElement("div");
        wrap.setAttribute(marker, "1");
        wrap.innerHTML = page.headerScripts;
        // Move nodes into head so scripts execute in head context where possible
        Array.from(wrap.childNodes).forEach((node) => {
          if (node.nodeName === "SCRIPT") {
            const old = node as HTMLScriptElement;
            const s = document.createElement("script");
            s.setAttribute(marker, "1");
            if (old.src) s.src = old.src;
            if (old.type) s.type = old.type;
            if (old.async) s.async = true;
            if (old.defer) s.defer = true;
            if (old.textContent) s.text = old.textContent;
            document.head.appendChild(s);
          } else {
            const clone = node.cloneNode(true) as HTMLElement;
            if (clone.setAttribute) clone.setAttribute(marker, "1");
            document.head.appendChild(clone);
          }
        });
      }
    })();

    return () => {
      cancelled = true;
      document.querySelectorAll(`[${marker}]`).forEach((el) => el.remove());
    };
  }, [path]);

  return null;
}

/** Body SEO content + optional H1 — place after Navbar (top) or before Footer (bottom). */
export function SeoBodySlot({ position }: { position: "top" | "bottom" }) {
  const pathname = usePathname();
  const path = normalizePath(pathname || "/");
  const [page, setPage] = useState<ExtrasPage | null>(null);

  useEffect(() => {
    if (path.startsWith("/seopanel") || path.startsWith("/admin") || path.startsWith("/api")) {
      setPage(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = await fetchExtras(path);
      if (!cancelled) setPage(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  useEffect(() => {
    if (!page?.bodyScripts?.trim()) return;
    if (position !== "bottom") return;

    const marker = "data-seo-body-script";
    document.querySelectorAll(`[${marker}]`).forEach((el) => el.remove());

    const wrap = document.createElement("div");
    wrap.innerHTML = page.bodyScripts;
    Array.from(wrap.childNodes).forEach((node) => {
      if (node.nodeName === "SCRIPT") {
        const old = node as HTMLScriptElement;
        const s = document.createElement("script");
        s.setAttribute(marker, "1");
        if (old.src) s.src = old.src;
        if (old.type) s.type = old.type;
        if (old.textContent) s.text = old.textContent;
        document.body.appendChild(s);
      }
    });

    return () => {
      document.querySelectorAll(`[${marker}]`).forEach((el) => el.remove());
    };
  }, [page?.bodyScripts, page?.path, position]);

  if (!page) return null;

  const pos = (page.bodyContentPosition || "bottom").toLowerCase();
  const showContent =
    !!page.bodyContentHtml?.trim() &&
    ((position === "top" && pos === "top") || (position === "bottom" && pos !== "top"));

  // H1 is rendered by page heroes (HeroSection / CityServicePageContent / service pages)
  if (!showContent) return null;

  return (
    <div className="w-full bg-white">
      <div
        className="prose prose-sm sm:prose max-w-6xl mx-auto px-4 sm:px-6 py-6"
        dangerouslySetInnerHTML={{ __html: page.bodyContentHtml! }}
      />
    </div>
  );
}

/** Breadcrumb label override for city/service pages */
export function useSeoBreadcrumbLabel(): string | null {
  const pathname = usePathname();
  const path = normalizePath(pathname || "/");
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const page = await fetchExtras(path);
      if (!cancelled) setLabel(page?.breadcrumbLabel?.trim() || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  return label;
}
