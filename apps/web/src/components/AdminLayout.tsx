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
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { isBillingAssistantPagePath } from "@/lib/admin-assistant-paths";

type AdminRole = "OWNER" | "BILLING_ASSISTANT";

type NavLeaf = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly AdminRole[];
  /** When true, only exact path matches (hub pages with child routes). */
  exact?: boolean;
};

type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: readonly AdminRole[];
  items: NavLeaf[];
};

type NavEntry =
  | ({ type: "link" } & NavLeaf)
  | ({ type: "group" } & NavGroup);

const NAV: NavEntry[] = [
  {
    type: "link",
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["OWNER"],
  },
  {
    type: "group",
    id: "bookings",
    label: "Bookings",
    icon: CalendarCheck,
    roles: ["OWNER", "BILLING_ASSISTANT"],
    items: [
      {
        href: "/admin/reservations",
        label: "Reservations",
        icon: CalendarCheck,
        roles: ["OWNER", "BILLING_ASSISTANT"],
      },
      {
        href: "/admin/live-auto",
        label: "Live Auto Mode",
        icon: Radio,
        roles: ["OWNER", "BILLING_ASSISTANT"],
      },
      {
        href: "/admin/custom-reservation",
        label: "Custom Reservation",
        icon: PlusCircle,
        roles: ["OWNER", "BILLING_ASSISTANT"],
      },
      {
        href: "/admin/quotes",
        label: "Online Quotes",
        icon: FileText,
        roles: ["OWNER", "BILLING_ASSISTANT"],
      },
    ],
  },
  {
    type: "group",
    id: "website",
    label: "Website",
    icon: Globe,
    roles: ["OWNER"],
    items: [
      { href: "/admin/fleet", label: "Fleet Pricing", icon: DollarSign, roles: ["OWNER"] },
      { href: "/admin/customers", label: "Website Customers", icon: Users, roles: ["OWNER"] },
    ],
  },
  {
    type: "group",
    id: "app",
    label: "App",
    icon: Smartphone,
    roles: ["OWNER"],
    items: [
      { href: "/admin/app-fleets", label: "Fleets", icon: Smartphone, roles: ["OWNER"] },
      { href: "/admin/promotions", label: "Promotions", icon: Tag, roles: ["OWNER"] },
      { href: "/admin/app-customers", label: "App Customers", icon: Users, roles: ["OWNER"] },
      { href: "/admin/referrals", label: "Referrals", icon: Gift, roles: ["OWNER"] },
      { href: "/admin/legal-docs", label: "Legal Content", icon: ScrollText, roles: ["OWNER"] },
    ],
  },
  {
    type: "group",
    id: "drivers",
    label: "Drivers",
    icon: Car,
    roles: ["OWNER"],
    items: [
      { href: "/admin/drivers", label: "All Drivers", icon: Car, roles: ["OWNER"] },
      { href: "/admin/driver-pay", label: "Driver Pay", icon: Wallet, roles: ["OWNER"] },
      { href: "/admin/track-drivers", label: "Track Drivers", icon: MapPin, roles: ["OWNER"] },
      { href: "/admin/trip-reviews", label: "Trip Reviews", icon: Star, roles: ["OWNER"] },
    ],
  },
  {
    type: "group",
    id: "partners",
    label: "Hotel Concierge",
    icon: Building2,
    roles: ["OWNER"],
    items: [
      { href: "/admin/concierge", label: "Overview", icon: Building2, roles: ["OWNER"], exact: true },
      { href: "/admin/concierge/hotels", label: "Hotels", icon: Building2, roles: ["OWNER"] },
      { href: "/admin/concierge/staff", label: "Staff", icon: Users, roles: ["OWNER"] },
      { href: "/admin/concierge/drivers", label: "Drivers", icon: Car, roles: ["OWNER"] },
      { href: "/admin/concierge/trips", label: "Trips", icon: MapPin, roles: ["OWNER"] },
      { href: "/admin/concierge/commissions", label: "Commissions", icon: DollarSign, roles: ["OWNER"] },
    ],
  },
  {
    type: "link",
    href: "/admin/support-tickets",
    label: "Support Tickets",
    icon: MessageSquareText,
    roles: ["OWNER"],
  },
  {
    type: "link",
    href: "/admin/billing",
    label: "Billing & Invoices",
    icon: Receipt,
    roles: ["OWNER", "BILLING_ASSISTANT"],
  },
  {
    type: "group",
    id: "team",
    label: "Team & Access",
    icon: ShieldCheck,
    roles: ["OWNER"],
    items: [
      { href: "/admin/operational-managers", label: "Operational Managers", icon: UserCog, roles: ["OWNER"] },
      { href: "/admin/admin-users", label: "Admin Users", icon: ShieldCheck, roles: ["OWNER"] },
    ],
  },
];

const SIDEBAR_WIDTH = "w-[268px]";

function pathActive(
  pathname: string | null,
  href: string,
  exact?: boolean
): boolean {
  if (!pathname) return false;
  if (href === "/admin" || exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupHasActive(pathname: string | null, items: NavLeaf[]): boolean {
  return items.some((item) => pathActive(pathname, item.href, item.exact));
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<AdminRole>("OWNER");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth/verify", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.authenticated) return;
        const next: AdminRole =
          data.role === "BILLING_ASSISTANT" ? "BILLING_ASSISTANT" : "OWNER";
        setRole(next);
        if (
          next === "BILLING_ASSISTANT" &&
          pathname &&
          !isBillingAssistantPagePath(pathname)
        ) {
          router.replace("/admin/billing");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const navEntries = useMemo(() => {
    return NAV.map((entry) => {
      if (entry.type === "link") {
        return (entry.roles as readonly string[]).includes(role) ? entry : null;
      }
      const items = entry.items.filter((item) =>
        (item.roles as readonly string[]).includes(role)
      );
      if (!items.length || !(entry.roles as readonly string[]).includes(role)) {
        return null;
      }
      return { ...entry, items };
    }).filter(Boolean) as NavEntry[];
  }, [role]);

  // Auto-expand the group that contains the current page
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const entry of NAV) {
        if (entry.type !== "group") continue;
        if (groupHasActive(pathname, entry.items)) {
          next[entry.id] = true;
        }
      }
      return next;
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const linkClass = (active: boolean, nested = false) =>
    `flex items-center gap-3 ${nested ? "pl-3 pr-3 py-2" : "px-3 py-2.5"} rounded-lg text-[13px] leading-snug transition-colors duration-150 group ${
      active
        ? "bg-[#C9A063] text-[#1a1a1a] font-semibold shadow-sm"
        : "text-white/55 hover:text-white hover:bg-white/[0.05] font-medium"
    }`;

  const iconClass = (active: boolean) =>
    `w-[18px] h-[18px] shrink-0 ${
      active ? "text-[#1a1a1a]" : "text-white/40 group-hover:text-[#C9A063]"
    }`;

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
        {/* Brand — wide wordmark, no circle crop */}
        <div className="shrink-0 px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 w-[72px] h-9 flex items-center justify-center">
              <Image
                src="/logo1.png"
                alt="SARJ Worldwide"
                width={72}
                height={28}
                className="object-contain w-[72px] h-auto max-h-9"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white tracking-tight leading-tight">
                SARJ
              </p>
              <p className="text-[11px] text-white/40 leading-snug mt-0.5">
                Management Portal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.12)_transparent]">
          <ul className="space-y-1">
            {navEntries.map((entry) => {
              if (entry.type === "link") {
                const Icon = entry.icon;
                const active = pathActive(pathname, entry.href, entry.exact);
                return (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      onClick={() => setSidebarOpen(false)}
                      className={linkClass(active)}
                    >
                      <Icon
                        className={iconClass(active)}
                        strokeWidth={active ? 2.25 : 2}
                      />
                      <span className="truncate">{entry.label}</span>
                    </Link>
                  </li>
                );
              }

              const GroupIcon = entry.icon;
              const open = Boolean(openGroups[entry.id]);
              const sectionActive = groupHasActive(pathname, entry.items);

              return (
                <li key={entry.id} className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(entry.id)}
                    aria-expanded={open}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] leading-snug transition-colors duration-150 group ${
                      sectionActive && !open
                        ? "text-[#C9A063] font-semibold"
                        : "text-white/70 hover:text-white hover:bg-white/[0.05] font-semibold"
                    }`}
                  >
                    <GroupIcon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        sectionActive
                          ? "text-[#C9A063]"
                          : "text-white/45 group-hover:text-[#C9A063]"
                      }`}
                      strokeWidth={2}
                    />
                    <span className="flex-1 text-left truncate tracking-wide uppercase text-[11px]">
                      {entry.label}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-white/35 transition-transform duration-200 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <ul className="overflow-hidden min-h-0 mt-0.5 ml-2 pl-2 border-l border-white/[0.08] space-y-0.5">
                      {entry.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathActive(pathname, item.href, item.exact);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={linkClass(active, true)}
                            >
                              <Icon
                                className={iconClass(active)}
                                strokeWidth={active ? 2.25 : 2}
                              />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
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
