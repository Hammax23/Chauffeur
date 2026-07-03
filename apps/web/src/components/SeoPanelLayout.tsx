"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  FileText,
  Globe,
  ArrowRightLeft,
  Map,
  Bot,
  Code2,
  BarChart3,
  Wrench,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Search,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/seopanel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/seopanel/pages", label: "Page SEO", icon: FileText },
  { href: "/seopanel/global", label: "Global Settings", icon: Globe },
  { href: "/seopanel/redirects", label: "Redirects", icon: ArrowRightLeft },
  { href: "/seopanel/sitemap", label: "Sitemap", icon: Map },
  { href: "/seopanel/robots", label: "Robots.txt", icon: Bot },
  { href: "/seopanel/schema", label: "Structured Data", icon: Code2 },
  { href: "/seopanel/analytics", label: "Analytics & Tags", icon: BarChart3 },
  { href: "/seopanel/technical", label: "Technical SEO", icon: Wrench },
];

export default function SeoPanelLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/seopanel") return pathname === "/seopanel";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch("/api/seopanel/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/seopanel";
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0f1419] text-white h-16 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-lg">SEO Panel</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/10 rounded-lg">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#0f1419] z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-white/10">
          <Image src="/logo1.png" alt="SARJ" width={140} height={50} className="h-8 w-auto mb-3" />
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">SEO Command Center</p>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
