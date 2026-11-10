"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Car,
  Menu,
  X,
  LogOut,
  PlusCircle,
  FileText,
  MapPin,
  UserCog,
  DollarSign,
  Smartphone,
  Building2,
  Radio,
  Globe,
  Star,
  MessageSquareText,
  ScrollText,
  Tag,
  Gift,
  Wallet,
  ShieldCheck,
  Receipt,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER"] as const },
  { href: "/admin/billing", label: "Billing & Invoices", icon: Receipt, roles: ["OWNER", "BILLING_ASSISTANT"] as const },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarCheck, roles: ["OWNER"] as const },
  { href: "/admin/live-auto", label: "Live Auto Mode", icon: Radio, roles: ["OWNER"] as const },
  { href: "/admin/custom-reservation", label: "Custom Reservation", icon: PlusCircle, roles: ["OWNER"] as const },
  { href: "/admin/quotes", label: "Online Quotes", icon: FileText, roles: ["OWNER"] as const },
  { href: "/admin/fleet", label: "Fleet Pricing", icon: DollarSign, roles: ["OWNER"] as const },
  { href: "/admin/app-fleets", label: "App Fleets", icon: Smartphone, roles: ["OWNER"] as const },
  { href: "/admin/promotions", label: "App Promotions", icon: Tag, roles: ["OWNER"] as const },
  { href: "/admin/referrals", label: "Referrals", icon: Gift, roles: ["OWNER"] as const },
  { href: "/admin/drivers", label: "Drivers", icon: Car, roles: ["OWNER"] as const },
  { href: "/admin/driver-pay", label: "Driver Pay", icon: Wallet, roles: ["OWNER"] as const },
  { href: "/admin/trip-reviews", label: "Trip Reviews", icon: Star, roles: ["OWNER"] as const },
  { href: "/admin/support-tickets", label: "Support Tickets", icon: MessageSquareText, roles: ["OWNER"] as const },
  { href: "/admin/legal-docs", label: "App Legal Content", icon: ScrollText, roles: ["OWNER"] as const },
  { href: "/admin/track-drivers", label: "Track Drivers", icon: MapPin, roles: ["OWNER"] as const },
  { href: "/admin/concierge", label: "Hotel Concierge", icon: Building2, roles: ["OWNER"] as const },
  { href: "/admin/operational-managers", label: "Operational Managers", icon: UserCog, roles: ["OWNER"] as const },
  { href: "/admin/admin-users", label: "Admin Users", icon: ShieldCheck, roles: ["OWNER"] as const },
  { href: "/admin/customers", label: "Customers", icon: Users, roles: ["OWNER"] as const },
  { href: "/admin/app-customers", label: "App Customers", icon: Users, roles: ["OWNER"] as const },
];

const SIDEBAR_WIDTH = "w-[268px]";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<"OWNER" | "BILLING_ASSISTANT">("OWNER");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth/verify", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.authenticated) return;
        const next =
          data.role === "BILLING_ASSISTANT" ? "BILLING_ASSISTANT" : "OWNER";
        setRole(next);
        if (
          next === "BILLING_ASSISTANT" &&
          pathname &&
          !pathname.startsWith("/admin/billing")
        ) {
          router.replace("/admin/billing");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => (item.roles as readonly string[]).includes(role)),
    [role]
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#141416] text-white h-14 flex items-center justify-between px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo1.png"
            alt="SARJ Worldwide"
            width={72}
            height={36}
            className="object-contain w-auto h-7"
          />
          <span className="font-semibold text-[15px] tracking-tight">Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full ${SIDEBAR_WIDTH} bg-[#141416] z-50 flex flex-col border-r border-white/[0.06] transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="shrink-0 px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#C9A063]/25 bg-[#1C1C1E]">
              <Image
                src="/logo1.png"
                alt="SARJ Worldwide"
                width={40}
                height={40}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white tracking-tight leading-tight">SARJ</p>
              <p className="text-[11px] text-white/40 leading-snug mt-0.5">Management Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation — scrollable so footer never overlaps */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] leading-snug transition-colors duration-150 group ${
                      active
                        ? "bg-[#C9A063] text-[#1a1a1a] font-semibold shadow-sm"
                        : "text-white/55 hover:text-white hover:bg-white/[0.05] font-medium"
                    }`}
                  >
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        active ? "text-[#1a1a1a]" : "text-white/40 group-hover:text-[#C9A063]"
                      }`}
                      strokeWidth={active ? 2.25 : 2}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="shrink-0 px-3 py-3 border-t border-white/[0.06] space-y-1 bg-[#141416]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <Globe className="w-[18px] h-[18px] shrink-0 text-white/40" />
            <span>Back to Website</span>
          </Link>
          <button
            type="button"
            onClick={async () => {
              try {
                await fetch("/api/admin/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
              } catch {
                /* redirect anyway */
              }
              window.location.href = "/admin";
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-red-400/90 hover:text-red-300 hover:bg-red-500/[0.08] transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="lg:ml-[268px] min-h-screen pt-14 lg:pt-0 text-gray-900">
        {children}
      </main>
    </div>
  );
}
