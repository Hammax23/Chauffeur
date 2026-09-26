import Link from "next/link";

type Props = { params: Promise<{ code: string }> };

export default async function ReferralLandingPage({ params }: Props) {
  const { code: raw } = await params;
  const code = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

  const deepLink = code ? `sarjworldwide://referral?code=${encodeURIComponent(code)}` : "sarjworldwide://";
  const iosStore = "https://apps.apple.com/";
  const androidStore = "https://play.google.com/store";

  return (
    <main className="min-h-screen bg-[#0A1120] text-white flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-[#C9A063] text-xs tracking-[0.2em] uppercase font-semibold">
          SARJ Worldwide
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">You&apos;re invited</h1>
        <p className="text-white/70 text-sm leading-relaxed">
          A friend invited you to book luxury chauffeur rides with SARJ Worldwide.
          {code ? (
            <>
              {" "}
              Open the app and your invite code <span className="text-[#C9A063] font-semibold">{code}</span>{" "}
              will be ready.
            </>
          ) : null}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <a
            href={deepLink}
            className="rounded-xl bg-[#C9A063] text-[#0A1120] font-semibold py-3.5 px-4 text-sm"
          >
            Open SARJ app
          </a>
          <div className="flex gap-3 justify-center text-xs text-white/50">
            <Link href={iosStore} className="underline hover:text-white/80">
              App Store
            </Link>
            <span>·</span>
            <Link href={androidStore} className="underline hover:text-white/80">
              Google Play
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
