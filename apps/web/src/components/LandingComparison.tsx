import Image from "next/image";
import { Car, CarFront, Check, Plane } from "lucide-react";

export type ComparisonStop = { label: string; time: string };
export type ComparisonRoute = {
  name: string;
  sub: string;
  total: string;
  highlight?: boolean;
  /** Stops between the door and the terminal, in order. */
  stops: ComparisonStop[];
  /** Label shown on the line when there are no stops. */
  direct?: string;
};

export type LandingComparisonContent = {
  eyebrow: string;
  title: [string, string];
  intro: string;
  points: { title: string; body: string }[];
  start: string;
  end: string;
  routes: ComparisonRoute[];
  /** When set, this image replaces the coded route cards. */
  image?: { src: string; alt: string; width: number; height: number };
};

/** Door-to-terminal comparison: a self-drive trip versus a chauffeur. */
export default function LandingComparison({ content }: { content: LandingComparisonContent }) {
  return (
    <section id="door-to-terminal" className="border-b border-gray-200 bg-[#f2f1ee] py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-10 px-6 sm:px-8 lg:px-12 xl:grid-cols-[0.8fr_1.2fr] xl:gap-12">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#C9A063]">{content.eyebrow}</span>
            <span className="h-px w-24 bg-[#C9A063]/60" aria-hidden />
          </div>
          <h2 style={{ textWrap: "balance" }} className="mt-4 text-3xl font-bold leading-[1.1] tracking-tight text-gray-950 sm:text-4xl xl:text-[44px]">
            {content.title[0]} <span className="text-[#C9A063]">{content.title[1]}</span>
          </h2>
          <p className="mt-5 text-[15px] font-light leading-7 text-gray-600">{content.intro}</p>
          <ul className="mt-7 space-y-4">
            {content.points.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-black text-[#C9A063]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <p className="text-sm leading-6 text-gray-600">
                  <strong className="font-bold text-gray-950">{p.title}:</strong> {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {content.image ? (
          <div className="min-w-0 rounded-[28px] bg-white p-3 shadow-lg sm:p-4">
            <Image
              src={content.image.src}
              alt={content.image.alt}
              width={content.image.width}
              height={content.image.height}
              sizes="(min-width: 1280px) 800px, 100vw"
              className="block h-auto w-full rounded-2xl"
            />
          </div>
        ) : (
        <div className="min-w-0 space-y-4">
          {content.routes.map((r) => (
            <div
              key={r.name}
              className={`overflow-hidden rounded-2xl border ${r.highlight ? "border-[#C9A063] bg-black text-white shadow-xl" : "border-gray-200 bg-white text-gray-950"}`}
            >
              <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-7">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${r.highlight ? "bg-[#C9A063] text-black" : "bg-black text-[#C9A063]"}`}>
                    {r.highlight ? <CarFront className="h-5 w-5" /> : <Car className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold">{r.name}</p>
                    <p className={`text-xs ${r.highlight ? "text-white/60" : "text-gray-500"}`}>{r.sub}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${r.highlight ? "text-[#C9A063]" : "text-gray-400"}`}>Door to terminal</p>
                  <p className="text-lg font-bold text-[#C9A063]">{r.total}</p>
                </div>
              </div>

              {/* Track: Door → stops → Terminal */}
              <div className="px-5 pb-6 pt-6 sm:px-7">
                <ol className="relative flex items-start justify-between">
                  <span className={`absolute left-2 right-2 top-[7px] h-0.5 ${r.highlight ? "bg-[#C9A063]/60" : "bg-[#C9A063]/40"}`} aria-hidden />
                  <Stop label={content.start} dark={r.highlight} />
                  {r.stops.length === 0 && r.direct && (
                    <li className="relative z-10 flex-1 px-2 pt-0 text-center">
                      <span className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-bold ${r.highlight ? "bg-[#C9A063] text-black" : "bg-gray-100 text-gray-700"}`}>{r.direct}</span>
                    </li>
                  )}
                  {r.stops.map((s) => (
                    <Stop key={s.label} label={s.label} time={s.time} dark={r.highlight} />
                  ))}
                  <Stop label={content.end} dark={r.highlight} end />
                </ol>
              </div>
            </div>
          ))}
          <p className="flex items-center gap-2 px-1 text-xs text-gray-500">
            <Plane className="h-3.5 w-3.5 text-[#C9A063]" />
            Times are estimates for a typical trip to Toronto Pearson and vary with traffic and terminal.
          </p>
        </div>
        )}
      </div>
    </section>
  );
}

function Stop({ label, time, dark, end }: { label: string; time?: string; dark?: boolean; end?: boolean }) {
  return (
    <li className="relative z-10 flex w-[72px] flex-col items-center text-center sm:w-24">
      <span className={`h-4 w-4 rounded-full border-2 ${end ? "border-[#C9A063] bg-[#C9A063]" : dark ? "border-[#C9A063] bg-black" : "border-[#C9A063] bg-white"}`} />
      <span className={`mt-2 text-[10px] font-bold uppercase leading-tight tracking-[0.08em] sm:text-[11px] ${dark ? "text-white" : "text-gray-950"}`}>{label}</span>
      {time && <span className="mt-0.5 text-[11px] font-semibold text-[#C9A063]">{time}</span>}
    </li>
  );
}
