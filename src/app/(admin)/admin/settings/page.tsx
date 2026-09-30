'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 p-6 md:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-6">
          Cài đặt hệ thống
        </h2>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tên WiFi trường học (SSID)
            </label>
            <input
              type="text"
              value={form.wifi_ssid}
              onChange={(e) => setForm({ ...form, wifi_ssid: e.target.value })}
              className="w-full h-11 px-3.5 border-[1.5px] border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]"
              placeholder="VD: Lumi-WiFi"
            />
            <p className="text-xs text-gray-400 mt-1">
              Gợi ý nhắc giáo viên kết nối đúng WiFi trường học khi mở trang điểm danh.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Dải IP trường học (Chống gian lận vị trí)
            </label>
            <input
              type="text"
              value={form.school_ip_range}
              onChange={(e) => setForm({ ...form, school_ip_range: e.target.value })}
              className="w-full h-11 px-3.5 border-[1.5px] border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]"
              placeholder="VD: * (cho phép tất cả) hoặc 192.168.1.0/24"
            />
            <p className="text-xs text-gray-400 mt-1">
              Nhập <code>*</code> nếu trường chưa có IP tĩnh, hoặc danh sách IP công cộng của trường ngăn cách bằng dấu phẩy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tiền tăng ca mặc định (VNĐ/giờ)
              </label>
              <input
                type="number"
                value={form.overtime_rate}
                onChange={(e) => setForm({ ...form, overtime_rate: e.target.value })}
                className="w-full h-11 px-3.5 border-[1.5px] border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]"
                placeholder="40000"
              />
              <p className="text-xs text-gray-400 mt-1">Mặc định 40.000 VNĐ/giờ (sau 17:00).</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Thời gian linh động (Grace period - phút)
              </label>
              <input
                type="number"
                value={form.grace_minutes}
                onChange={(e) => setForm({ ...form, grace_minutes: e.target.value })}
                className="w-full h-11 px-3.5 border-[1.5px] border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]"
                placeholder="1"
              />
              <p className="text-xs text-gray-400 mt-1">Cho phép vào trễ tối đa trước khi tính đi trễ.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow transition-colors disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
