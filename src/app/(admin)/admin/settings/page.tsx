'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentIp, setCurrentIp] = useState('');
  const [form, setForm] = useState({
    wifi_ssid: 'Lumi-WiFi',
    school_ip_range: '*',
    overtime_rate: '40000',
    grace_minutes: '1',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          if (data.current_ip) setCurrentIp(data.current_ip);
          setForm((prev) => ({
            ...prev,
            wifi_ssid: data.wifi_ssid || prev.wifi_ssid,
            school_ip_range: data.school_ip_range || prev.school_ip_range,
            overtime_rate: data.overtime_rate || prev.overtime_rate,
            grace_minutes: data.grace_minutes || prev.grace_minutes,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Đã lưu cấu hình thành công!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400 py-10 text-center">Đang tải cấu hình...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-2xl shadow-sm border border-[#eef2f0] p-6 md:p-8">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-6 tracking-tight">
          Cài đặt hệ thống
        </h2>

        {message && (
          <div
            className={`p-4 rounded-xl mb-6 text-xs sm:text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
              Tên WiFi trường học (SSID)
            </label>
            <input
              type="text"
              value={form.wifi_ssid}
              onChange={(e) => setForm({ ...form, wifi_ssid: e.target.value })}
              className="w-full h-11 px-3.5 border border-[#d8e3dc] rounded-xl text-xs sm:text-sm text-gray-900 outline-none focus:border-[#2e8b57] bg-[#f8faf9] focus:bg-white font-medium"
              placeholder="VD: Lumi-WiFi"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Gợi ý nhắc giáo viên kết nối đúng WiFi trường học khi mở trang điểm danh.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs sm:text-sm font-bold text-gray-700">
                Dải IP trường học (Chống gian lận vị trí)
              </label>
              {currentIp && (
                <button
                  type="button"
                  onClick={() => {
                    const existing = form.school_ip_range.trim();
                    if (existing === '*' || !existing) {
                      setForm({ ...form, school_ip_range: currentIp });
                    } else if (!existing.includes(currentIp)) {
                      setForm({ ...form, school_ip_range: `${existing}, ${currentIp}` });
                    }
                  }}
                  className="text-[11px] text-[#1e6b3e] hover:underline font-bold bg-[#eef7ee] border border-[#cbe4cb] px-2.5 py-0.5 rounded-lg cursor-pointer"
                >
                  + Lấy IP hiện tại ({currentIp})
                </button>
              )}
            </div>
            <input
              type="text"
              value={form.school_ip_range}
              onChange={(e) => setForm({ ...form, school_ip_range: e.target.value })}
              className="w-full h-11 px-3.5 border border-[#d8e3dc] rounded-xl text-xs sm:text-sm text-gray-900 outline-none focus:border-[#2e8b57] bg-[#f8faf9] focus:bg-white font-medium font-mono"
              placeholder="VD: * (cho phép tất cả) hoặc 1.53.84.52"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Nhập <code className="bg-gray-100 px-1 py-0.5 rounded">*</code> nếu cho phép mọi mạng, hoặc nhập địa chỉ IP công cộng của router WiFi trường (hỗ trợ nhiều IP ngăn cách bằng dấu phẩy).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                Tiền tăng ca mặc định (VNĐ/giờ)
              </label>
              <input
                type="number"
                value={form.overtime_rate}
                onChange={(e) => setForm({ ...form, overtime_rate: e.target.value })}
                className="w-full h-11 px-3.5 border border-[#d8e3dc] rounded-xl text-xs sm:text-sm text-gray-900 outline-none focus:border-[#2e8b57] bg-[#f8faf9] focus:bg-white font-medium"
                placeholder="40000"
              />
              <p className="text-[11px] text-gray-400 mt-1">Mặc định 40.000 VNĐ/giờ (sau 17:00).</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1.5">
                Thời gian linh động (Grace period - phút)
              </label>
              <input
                type="number"
                value={form.grace_minutes}
                onChange={(e) => setForm({ ...form, grace_minutes: e.target.value })}
                className="w-full h-11 px-3.5 border border-[#d8e3dc] rounded-xl text-xs sm:text-sm text-gray-900 outline-none focus:border-[#2e8b57] bg-[#f8faf9] focus:bg-white font-medium"
                placeholder="1"
              />
              <p className="text-[11px] text-gray-400 mt-1">Cho phép vào trễ tối đa trước khi tính đi trễ.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#f0f4f1] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer border-none"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
