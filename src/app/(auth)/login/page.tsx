'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PolicyModals, type PolicyType } from '@/components/PolicyModals';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [policyModal, setPolicyModal] = useState<PolicyType>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email hoặc mật khẩu không chính xác!');
      } else {
        // Fetch session to determine redirect
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        const role = session?.user?.role;
        const mustChange = session?.user?.must_change_password;

        if (mustChange) {
          router.push('/change-password');
        } else if (role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/teacher');
        }
        router.refresh();
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ background: 'linear-gradient(145deg, #f0f7f0 0%, #ffffff 100%)' }}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <div className="w-full bg-white rounded-2xl shadow-[0_10px_25px_-5px_rgba(46,139,87,0.1),0_8px_10px_-6px_rgba(0,0,0,0.05)] p-7 sm:p-9 flex flex-col items-center border border-[rgba(46,139,87,0.08)]">
            {/* Logo */}
            <div className="w-20 h-20 mb-3.5 rounded-full overflow-hidden shadow-[0_4px_12px_rgba(46,139,87,0.2)]">
              <Image
                src="/logolumi.jpg"
                alt="Lumi Preschool Logo"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            <span className="inline-flex items-center gap-1 bg-[#e8f5e9] text-[#2e8b57] px-3 py-1 rounded-full text-[11px] font-bold mb-2.5 uppercase tracking-wider">
              Mầm Non Khai Minh
            </span>
            <h1 className="text-2xl font-bold text-[#2e8b57] mb-1 tracking-tight">LUMI Preschool</h1>
            <p className="text-xs text-gray-500 text-center mb-6 font-medium">Hệ thống chấm công giáo viên</p>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 px-3.5 py-2.5 rounded-lg text-[13.5px] mb-4 w-full">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="w-full">
              {/* Email */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="chinh@lumi.vn"
                    required
                    className="w-full h-11 pl-[42px] pr-3.5 border-[1.5px] border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 outline-none transition-all focus:bg-white focus:border-[#2e8b57] focus:ring-2 focus:ring-[#2e8b57]/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-5">
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                    className="w-full h-11 pl-[42px] pr-[42px] border-[1.5px] border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 outline-none transition-all focus:bg-white focus:border-[#2e8b57] focus:ring-2 focus:ring-[#2e8b57]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 bg-transparent border-none cursor-pointer"
                    title="Hiện/ẩn mật khẩu"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#2e8b57] hover:bg-[#246e45] active:translate-y-[1px] text-white rounded-xl text-base font-semibold cursor-pointer transition-all shadow-md shadow-[#2e8b57]/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : 'Đăng nhập'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Full Footer for Login */}
      <footer className="text-center py-5 px-4 bg-white/80 backdrop-blur-xs border-t border-emerald-100 flex flex-col gap-2 text-xs text-gray-500">
        <div className="font-bold text-gray-800 text-sm">
          LUMI Preschool — Mầm Non Khai Minh
        </div>
        <div className="text-xs font-semibold text-[#2e8b57]">
          LUMI Preschool - Mầm Non Trải Nghiệm STEAM &amp; Tiếng Anh
        </div>
        <div className="text-gray-500 font-medium">
          T16-33, Vinhomes Grand Park, TP. Thủ Đức
        </div>

        {/* Policy & Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[12px] font-semibold text-emerald-800/90 pt-2 pb-1 border-t border-gray-100">
          <button
            onClick={() => setPolicyModal('privacy')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            Chính sách bảo mật
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('attendance')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            Quy định chấm công
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('cookie')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            Chính sách Cookie
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('support')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            Báo sự cố &amp; Hỗ trợ
          </button>
        </div>

        <div className="text-slate-600 text-xs mt-1 pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 leading-normal">
          <span>Thiết kế &amp; Phát triển hệ thống bởi:</span>
          <a
            href="mailto:vietthanhnguyen.tsen@gmail.com"
            className="text-[#2e8b57] font-bold hover:underline inline-block whitespace-nowrap"
          >
            Nguyễn Việt Thành (vietthanhnguyen.tsen@gmail.com)
          </a>
        </div>
        <div className="text-[11px] text-gray-400">© 2026 LUMI Preschool. All rights reserved.</div>
      </footer>

      {/* Policy Modals */}
      <PolicyModals activePolicy={policyModal} onClose={() => setPolicyModal(null)} />
    </div>
  );
}
