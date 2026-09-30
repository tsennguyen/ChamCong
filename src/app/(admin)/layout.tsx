'use client';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Clock,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  ArrowUpRight,
} from 'lucide-react';
import { PolicyModals, type PolicyType } from '@/components/PolicyModals';

const navItems = [
  { name: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
  { name: 'Chấm công', href: '/admin/attendance', icon: CalendarCheck },
  { name: 'Giáo viên', href: '/admin/teachers', icon: Users },
  { name: 'Ca làm việc', href: '/admin/shifts', icon: Clock },
  { name: 'Báo cáo', href: '/admin/reports', icon: BarChart3 },
  { name: 'Google Sheets', href: '/admin/sheets', icon: FileSpreadsheet },
  { name: 'Cài đặt', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyType>(null);

  const currentPage = navItems.find((i) => i.href === pathname) || navItems[0];
  const userInitials = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'A';

  return (
    <div className="flex min-h-screen bg-[#f0f7f0] text-gray-800 antialiased font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[99] md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        w-[250px] bg-[#1a5d36] text-white flex flex-col shrink-0 z-[100]
        fixed md:sticky top-0 h-screen overflow-y-auto shadow-lg
        transition-transform duration-300 ease-in-out border-r border-[#154d2c]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        {/* Brand Header */}
        <div className="px-5 py-4.5 flex items-center gap-3 border-b border-white/10">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white/20 shrink-0 shadow-sm bg-white">
            <Image
              src="/logolumi.jpg"
              alt="Logo Lumi"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-white tracking-tight leading-snug truncate">
              LUMI Preschool
            </span>
            <span className="text-[11px] font-medium text-emerald-200/80 truncate">
              Mầm Non Khai Minh
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70 px-3 mb-2">
            Quản trị hệ thống
          </div>
          <ul className="list-none flex flex-col gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all relative no-underline
                      ${
                        active
                          ? 'bg-white text-[#1a5d36] shadow-sm font-bold'
                          : 'text-white/85 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#1a5d36]' : 'text-emerald-200/80'}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Quick link to Teacher View */}
        <div className="px-3 pb-3">
          <Link
            href="/teacher"
            className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-700/60 hover:bg-emerald-700 text-emerald-100 transition-colors border border-emerald-600/50"
          >
            <span className="truncate">Trang Điểm Danh</span>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
          </Link>
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-white/10 bg-black/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/30 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/20">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate max-w-[120px]">
                {user?.name || 'Admin'}
              </span>
              <span className="text-[10px] text-emerald-200/70 font-medium">Quản trị viên</span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-white/10 border-none text-white/80 hover:text-white w-8 h-8 rounded-xl cursor-pointer flex items-center justify-center hover:bg-rose-600 transition-all shrink-0"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar header */}
        <header className="h-14 bg-white/85 backdrop-blur-md border-b border-[#eef2f0] flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-gray-700 hover:text-emerald-700 p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 cursor-pointer border-none transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
                {currentPage.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/teacher"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#1e6b3e] bg-[#eef7ee] hover:bg-[#e2f0e2] px-3 py-1.5 rounded-xl border border-[#cbe4cb] transition-all shadow-xs"
            >
              <span>Vào trang Điểm danh</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl shadow-2xs">
              {user?.gender === 'male' ? 'Thầy' : 'Cô'} {user?.name || 'Admin'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6 lg:p-7 flex flex-col gap-5 flex-1">{children}</div>

        {/* Footer Credit & Policies */}
        <footer className="px-6 py-4 bg-white/80 backdrop-blur-sm border-t border-[#eef2f0] text-xs text-gray-500 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <div className="font-bold text-gray-800">
              LUMI Preschool — Mầm Non Khai Minh
            </div>
            <div className="text-[11px] text-gray-400">
              T16-33, Vinhomes Grand Park, TP. Thủ Đức
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11.5px] font-semibold text-emerald-800">
            <button onClick={() => setPolicyModal('privacy')} className="hover:text-emerald-950 hover:underline cursor-pointer bg-transparent border-none">
              Chính sách bảo mật
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={() => setPolicyModal('attendance')} className="hover:text-emerald-950 hover:underline cursor-pointer bg-transparent border-none">
              Quy định chấm công
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={() => setPolicyModal('cookie')} className="hover:text-emerald-950 hover:underline cursor-pointer bg-transparent border-none">
              Chính sách Cookie
            </button>
            <span className="text-gray-300">•</span>
            <button onClick={() => setPolicyModal('support')} className="hover:text-emerald-950 hover:underline cursor-pointer bg-transparent border-none">
              Báo sự cố &amp; Hỗ trợ
            </button>
          </div>

          <div className="text-center md:text-right text-xs text-slate-600 flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5">
            <span>Thiết kế &amp; Phát triển:</span>
            <a
              href="mailto:vietthanhnguyen.tsen@gmail.com"
              className="text-[#2e8b57] font-bold hover:underline whitespace-nowrap"
            >
              Nguyễn Việt Thành (vietthanhnguyen.tsen@gmail.com)
            </a>
          </div>
        </footer>

        {/* Policy Modals */}
        <PolicyModals activePolicy={policyModal} onClose={() => setPolicyModal(null)} />
      </main>
    </div>
  );
}
