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
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  PlusCircle,
  FileText,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Reservations", icon: CalendarCheck },
  { href: "/admin/custom-reservation", label: "Custom Reservation", icon: PlusCircle },
  { href: "/admin/quotes", label: "Online Quotes", icon: FileText },
  { href: "/admin/drivers", label: "Drivers", icon: Car },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/app-customers", label: "App Customers", icon: Users },
];

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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1C1C1E] text-white h-16 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Image 
            src="/logo1.png" 
            alt="SARJ Worldwide Logo" 
            width={80}
            height={40}
            className="object-contain w-auto h-8"
          />
          <span className="font-bold text-lg">Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#1C1C1E] z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo1.png" 
              alt="SARJ Worldwide Logo" 
              width={120}
              height={60}
              className="object-contain w-auto h-12"
            />
            <div>
              <h1 className="font-bold text-white text-lg">SARJ</h1>
              <p className="text-gray-500 text-xs">Management Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  active
                    ? "bg-gradient-to-r from-[#C9A063] to-[#A68B5B] text-white shadow-lg shadow-[#C9A063]/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-white" : "text-gray-500 group-hover:text-[#C9A063]"}`} />
                <span className="font-medium">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span className="font-medium">Back to Website</span>
          </Link>
          <button
            onClick={async () => {
              try {
                await fetch("/api/admin/auth/logout", {
                  method: "POST",
                  credentials: "include",
                });
              } catch {
                // Continue with redirect even if API fails
              }
              window.location.href = "/admin";
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
