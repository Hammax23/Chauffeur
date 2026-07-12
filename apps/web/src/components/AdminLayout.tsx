"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Globe,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarCheck },
  { href: "/admin/custom-reservation", label: "Custom Reservation", icon: PlusCircle },
  { href: "/admin/quotes", label: "Online Quotes", icon: FileText },
  { href: "/admin/fleet", label: "Fleet Pricing", icon: DollarSign },
  { href: "/admin/drivers", label: "Drivers", icon: Car },
  { href: "/admin/track-drivers", label: "Track Drivers", icon: MapPin },
  { href: "/admin/operational-managers", label: "Operational Managers", icon: UserCog },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/app-customers", label: "App Customers", icon: Smartphone },
];

const SIDEBAR_WIDTH = "w-[268px]";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

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
            {NAV_ITEMS.map((item) => {
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

      <main className="lg:ml-[268px] min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
