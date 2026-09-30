'use client';

import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const navItems = [
  { name: 'Tổng quan', href: '/admin', icon: '📊' },
  { name: 'Chấm công', href: '/admin/attendance', icon: '📋' },
  { name: 'Giáo viên', href: '/admin/teachers', icon: '👩‍🏫' },
  { name: 'Ca làm việc', href: '/admin/shifts', icon: '⏰' },
  { name: 'Ca ngoài giờ', href: '/admin/overtime', icon: '🌙' },
  { name: 'Báo cáo', href: '/admin/reports', icon: '📈' },
  { name: 'Thiết bị', href: '/admin/devices', icon: '📱' },
  { name: 'Google Sheets', href: '/admin/sheets', icon: '🔄' },
  { name: 'Cài đặt', href: '/admin/settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage = navItems.find(i => i.href === pathname) || navItems[0];

  return (
    <div className="flex min-h-screen bg-[#f5f5f5] text-gray-800">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-[99] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        w-[260px] bg-[#1e6b3e] text-white flex flex-col shrink-0 z-[100]
        fixed md:sticky top-0 h-screen overflow-y-auto shadow-[2px_0_10px_rgba(0,0,0,0.1)]
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="px-[18px] py-5 flex items-center gap-3 border-b border-white/[0.12]">
          <Image src="/logolumi.jpg" alt="Logo" width={40} height={40} className="rounded-full shrink-0" />
          <div className="flex flex-col">
            <span className="text-base font-bold text-white leading-tight">Lumi Preschool</span>
            <span className="inline-block bg-[#f5a623] text-[#1e6b3e] text-[11px] font-extrabold px-1.5 py-0.5 rounded mt-1 w-fit uppercase tracking-wider">Admin Portal</span>
          </div>
        </div>

        {/* Nav */}
        <ul className="list-none px-2.5 py-4 flex flex-col gap-1 flex-1">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-[11px] rounded-lg text-[14.5px] font-medium transition-all relative no-underline
                    ${active
                      ? 'bg-white/[0.15] text-white font-semibold'
                      : 'text-white/[0.82] hover:bg-white/[0.1] hover:text-white'}
                  `}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#f5a623] rounded-r" />}
                  <span className="text-lg w-[22px] text-center">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="px-[18px] py-4 border-t border-white/[0.12] bg-black/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[13.5px] font-semibold text-white">Xin chào, {user?.name || 'Admin'}</span>
            <span className="text-[11.5px] text-white/65">Quản trị hệ thống</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-white/[0.12] border-none text-white w-8 h-8 rounded-md cursor-pointer flex items-center justify-center hover:bg-red-500 transition-colors"
            title="Đăng xuất"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-7 sticky top-0 z-40">
          <div className="flex items-center gap-3.5">
            <button
              className="md:hidden text-gray-700 text-2xl bg-transparent border-none cursor-pointer"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              ☰
            </button>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>{currentPage.icon}</span> {currentPage.name}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[14.5px] font-semibold text-[#2e8b57] bg-[#e8f5e9] px-3.5 py-1.5 rounded-full hidden sm:inline">
              Hi, {user?.gender === 'male' ? 'Thầy' : 'Cô'} {user?.name || 'Admin'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 md:p-7 flex flex-col gap-6 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
