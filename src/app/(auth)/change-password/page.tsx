'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword === currentPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 4) {
      setError('Mật khẩu mới phải có ít nhất 4 ký tự');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đã xảy ra lỗi, vui lòng thử lại');
        setLoading(false);
        return;
      }

      // Re-authenticate or update session to obtain fresh JWT token
      const userEmail = data.email || (session?.user as any)?.email;
      if (userEmail) {
        try {
          await signIn('credentials', {
            email: userEmail,
            password: newPassword,
            redirect: false,
          });
        } catch {
          // Fallback to session update if signIn fails
          try {
            await update({ must_change_password: false });
          } catch {}
        }
      }

      // Perform a full hard navigation to avoid stale router state or cached redirects
      const targetUrl = data.role === 'admin' ? '/admin' : '/teacher';
      window.location.href = targetUrl;
    } catch (err) {
      setError('Đã xảy ra lỗi kết nối, vui lòng thử lại');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-lumi-yellow/20 rounded-full flex items-center justify-center text-lumi-yellow">
              <KeyRound size={32} />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Đổi mật khẩu
          </h1>
          <p className="text-center text-gray-500 mb-8 text-sm">
            Vui lòng đổi mật khẩu cho lần đăng nhập đầu tiên để bảo mật tài khoản
          </p>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-6 text-center border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
              <input
                type="password"
                id="current-password"
                name="current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lumi-green focus:border-lumi-green outline-none transition-all"
                placeholder="Nhập mật khẩu hiện tại"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                id="new-password"
                name="new-password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lumi-green focus:border-lumi-green outline-none transition-all"
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                id="confirm-password"
                name="confirm-password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lumi-green focus:border-lumi-green outline-none transition-all"
                placeholder="Nhập lại mật khẩu mới"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lumi-green hover:bg-lumi-green-dark text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center mt-6 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Cập nhật mật khẩu'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
