'use client';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Clock,
  Moon,
  BarChart,
  Smartphone,
  RefreshCw,
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
    { name: 'Chấm công', href: '/admin/attendance', icon: ClipboardList },
    { name: 'Giáo viên', href: '/admin/teachers', icon: Users },
    { name: 'Ca làm việc', href: '/admin/shifts', icon: Clock },
    { name: 'Ca ngoài giờ', href: '/admin/extra', icon: Moon },
    { name: 'Báo cáo', href: '/admin/reports', icon: BarChart },
    { name: 'Thiết bị', href: '/admin/devices', icon: Smartphone },
    { name: 'Google Sheets', href: '/admin/sync', icon: RefreshCw },
    { name: 'Cài đặt', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#1e6b3e] text-white p-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center">
          <span>Lumi Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`bg-[#1e6b3e] text-white w-64 flex-shrink-0 flex-col ${sidebarOpen ? 'flex' : 'hidden'} md:flex absolute md:relative z-10 h-full min-h-screen`}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-bold">Lumi Preschool</h1>
          <p className="text-sm opacity-80 mt-1">Admin Dashboard</p>
        </div>
        
        <nav className="flex-1 px-4 pb-4 overflow-y-auto mt-4 md:mt-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-[#2e8b57] text-white' : 'hover:bg-[#2e8b57]/50 text-white/90'}`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-white/10 mt-auto">
          <div className="mb-4">
            <p className="text-sm font-medium">Xin chào,</p>
            <p className="font-bold truncate">{user?.name || 'Admin'}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center space-x-2 text-white/80 hover:text-white w-full p-2 rounded hover:bg-white/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm h-16 hidden md:flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(i => i.href === pathname)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center">
            <span className="text-gray-600 mr-4">Hi, {user?.gender === 'male' ? 'Thầy' : 'Cô'} {user?.name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
