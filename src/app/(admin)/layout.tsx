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

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] text-gray-800">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-[99] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
        w-[240px] bg-[#1e6b3e] text-white flex flex-col shrink-0 z-[100]
        fixed md:sticky top-0 h-screen overflow-y-auto shadow-md
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        {/* Brand */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/10">
          <Image src="/logolumi.jpg" alt="Logo" width={38} height={38} className="rounded-full shrink-0 object-cover" />
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-white leading-tight">LUMI Preschool</span>
            <span className="text-[11px] font-medium text-white/70">Mầm Non Khai Minh</span>
          </div>
        </div>

        {/* Nav */}
        <ul className="list-none px-3 py-3 flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative no-underline
                    ${
                      active
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#f5a623] rounded-r" />}
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10 bg-black/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white truncate max-w-[140px]">{user?.name || 'Admin'}</span>
            <span className="text-[11px] text-white/60">Quản trị viên</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-white/10 border-none text-white w-7 h-7 rounded-md cursor-pointer flex items-center justify-center hover:bg-red-500 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-gray-700 bg-transparent border-none cursor-pointer p-1"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">
              {currentPage.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full hidden sm:inline">
              {user?.gender === 'male' ? 'Thầy' : 'Cô'} {user?.name || 'Admin'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-6 flex flex-col gap-5 flex-1">{children}</div>

        {/* Footer Credit & Policies */}
        <footer className="px-6 py-4 bg-white border-t border-gray-200 text-xs text-gray-500 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-center md:text-left">
            <div className="font-bold text-gray-800">
              LUMI Preschool — Mầm Non Khai Minh
            </div>
            <div className="text-[11px] text-gray-400">
              T16-33, Vinhomes Grand Park, TP. Thủ Đức
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11.5px] font-semibold text-emerald-800">
            <button onClick={() => setPolicyModal('privacy')} className="hover:text-emerald-950 hover:underline cursor-pointer">Chính sách bảo mật</button>
            <span className="text-gray-300">•</span>
            <button onClick={() => setPolicyModal('attendance')} className="hover:text-emerald-950 hover:underline cursor-pointer">Quy định chấm công</button>
            <span className="text-gray-300">•</span>
            <button onClick={() => setPolicyModal('cookie')} className="hover:text-emerald-950 hover:underline cursor-pointer">Chính sách Cookie</button>
            <span className="text-gray-300">•</span>
            <button onClick={() => setPolicyModal('support')} className="hover:text-emerald-950 hover:underline cursor-pointer">Báo sự cố &amp; Hỗ trợ</button>
          </div>

          <div className="text-center md:text-right text-sm text-slate-600">
            Thiết kế &amp; Phát triển:{' '}
            <a
              href="mailto:vietthanhnguyen.tsen@gmail.com"
              className="text-[#2e8b57] font-bold hover:underline"
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
