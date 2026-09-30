'use client';

import { useAuth } from '@/hooks/useAuth';
import { getGreeting } from '@/lib/greeting';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { LogOut } from 'lucide-react';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f7f0]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lumi-green"></div>
      </div>
    );
  }

  const greeting = user ? getGreeting(user.gender, user.name) : '';

  return (
    <div className="min-h-screen bg-[#f0f7f0] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-lumi-green-light sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logolumi.jpg" alt="Lumi" width={40} height={40} className="rounded-full" />
            <span className="font-semibold text-lumi-green text-lg hidden sm:inline">Lumi Preschool</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{greeting}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-gray-400 hover:text-red-500 transition-colors p-1"
              title="Đăng xuất"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-400 py-4">
        © 2026 Lumi Preschool
      </footer>
    </div>
  );
}
