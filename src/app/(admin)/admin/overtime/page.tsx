'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTodayString } from '@/lib/utils';

interface ExtraSession {
  id: string;
  user_id: string;
  session_date: string;
  planned_start: string;
  planned_end: string;
  actual_check_in: string | null;
  actual_check_out: string | null;
  total_minutes: number;
  note: string | null;
  user?: { id: string; full_name: string; gender: string };
}

interface Teacher {
  id: string;
  full_name: string;
  gender: string;
}

export default function OvertimePage() {
  const [sessions, setSessions] = useState<ExtraSession[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    user_id: '',
    session_date: getTodayString(),
    planned_start: '17:00',
    planned_end: '18:30',
    note: 'Trông muộn',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/overtime?date=${selectedDate}`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetch('/api/teachers')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeachers(data);
          if (data.length > 0) {
            setForm((f) => ({ ...f, user_id: data[0].id }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.user_id || !form.session_date) {
      setError('Vui lòng chọn giáo viên và ngày');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra');
      } else {
        setModalOpen(false);
        fetchData();
      }
    } catch {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa ca ngoài giờ này?')) return;
    try {
      await fetch(`/api/overtime?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch {}
  };

  const fmtTime = (t: string | null) =>
    t ? new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const getTitle = (g?: string) => (g === 'male' ? 'Thầy' : 'Cô');

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
          />
          <button
            onClick={fetchData}
            className="bg-[#2e8b57] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#246e45] transition-colors"
          >
            🔄 Tải lại
          </button>
        </div>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, session_date: selectedDate }));
            setError('');
            setModalOpen(true);
          }}
          className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow transition-colors"
        >
          ➕ Thêm ca ngoài giờ
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200 w-10">#</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Giáo viên</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Kế hoạch</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Thực tế vào</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Thực tế ra</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Nội dung</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
              )}
              {!loading && sessions.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Không có ca ngoài giờ nào ngày này</td></tr>
              )}
              {sessions.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 border-b border-slate-100">{i + 1}</td>
                  <td className="px-4 py-3 border-b border-slate-100 font-semibold whitespace-nowrap">
                    {getTitle(s.user?.gender)} {s.user?.full_name}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 whitespace-nowrap">
                    {s.planned_start.slice(0, 5)} - {s.planned_end.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100">{fmtTime(s.actual_check_in)}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{fmtTime(s.actual_check_out)}</td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold">
                      {s.note || 'Ca ngoài giờ'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 text-center">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="px-2.5 py-1 rounded-md text-[12.5px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">🌙 Phân công ca ngoài giờ</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {error && <div className="text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Giáo viên phụ trách *</label>
                <select
                  value={form.user_id}
                  onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {getTitle(t.gender)} {t.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày *</label>
                <input
                  type="date"
                  value={form.session_date}
                  onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={form.planned_start}
                    onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={form.planned_end}
                    onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nội dung / Ghi chú</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="VD: Trông muộn, CLB Vẽ, Múa, Cảm thụ âm nhạc..."
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer">Hủy</button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#2e8b57] hover:bg-[#246e45] shadow cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Đang tạo...' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
