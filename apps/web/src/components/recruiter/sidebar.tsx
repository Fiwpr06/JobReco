"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, Users, BarChart3, LogOut } from "lucide-react";

export function RecruiterSidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Tổng Quan",       href: "/recruiter/dashboard",            icon: LayoutDashboard },
    { name: "Tin Tuyển Dụng",  href: "/recruiter/dashboard?view=postings", icon: Briefcase },
    { name: "Tìm Ứng Viên",    href: "/recruiter/candidates",           icon: Users },
    { name: "Skill Analytics", href: "/recruiter/dashboard?view=heatmap",  icon: BarChart3 },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-screen select-none shadow-sm">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-none">Recruiter</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Hệ thống Đánh giá Mức độ Phù hợp</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest px-3 mb-3">
          Menu
        </div>
        {links.map((link) => {
          const Icon     = link.icon;
          const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== "/recruiter/dashboard");
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
            HR
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-slate-900 truncate">HR Manager</div>
            <div className="text-[10px] text-slate-400 truncate">Nhà tuyển dụng</div>
          </div>
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-red-500 hover:bg-red-50 transition-colors font-medium">
          <LogOut className="w-4 h-4" />Đăng Xuất
        </button>
      </div>
    </aside>
  );
}
