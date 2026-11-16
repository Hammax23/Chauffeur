import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ServiceLinkView } from "@/lib/service-links";

/** Internal links managed from the SEO panel (Service Manager → Links). Renders nothing if empty. */
export default function ServiceRelatedLinks({ links }: { links: ServiceLinkView[] }) {
  if (!links.length) return null;
  return (
    <section className="w-full" aria-labelledby="related-reading">
      <h2 id="related-reading" className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-6">
        Related Guides and Resources
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {links.map((l) => {
          const external = /^https?:\/\//i.test(l.url);
          const cls =
            "group flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-5 py-4 text-gray-800 font-medium hover:border-[#C9A063] hover:text-[#C9A063] transition-colors";
          return (
            <li key={l.id}>
              {external ? (
                <a href={l.url} className={cls} target="_blank" rel="noopener">
                  <span>{l.label}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </a>
              ) : (
                <Link href={l.url} className={cls}>
                  <span>{l.label}</span>
                  <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
