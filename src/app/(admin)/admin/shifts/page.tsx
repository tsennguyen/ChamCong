'use client';

import { useState, useEffect, useCallback } from 'react';

interface Shift {
  id: string; name: string; type: string; start_time: string; end_time: string;
  grace_minutes: number; overtime_rate: number; is_active: boolean;
}

interface ShiftForm {
  name: string; type: string; start_time: string; end_time: string;
  grace_minutes: string; overtime_rate: string;
}

const emptyForm: ShiftForm = { name: '', type: 'regular', start_time: '07:00', end_time: '17:00', grace_minutes: '1', overtime_rate: '40000' };

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ShiftForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts');
      const data = await res.json();
      setShifts(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = (s: Shift) => {
    setEditId(s.id);
    setForm({
      name: s.name, type: s.type,
      start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5),
      grace_minutes: String(s.grace_minutes), overtime_rate: String(s.overtime_rate),
    });
    setError(''); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) { setError('Vui lòng nhập đầy đủ'); return; }
    setSaving(true); setError('');

    try {
      const url = editId ? `/api/shifts/${editId}` : '/api/shifts';
      const method = editId ? 'PUT' : 'POST';
      const body = {
        name: form.name, type: form.type,
        start_time: form.start_time, end_time: form.end_time,
        grace_minutes: parseInt(form.grace_minutes) || 1,
        overtime_rate: parseInt(form.overtime_rate) || 40000,
      };

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Lỗi'); setSaving(false); return; }
      setModalOpen(false); fetchShifts();
    } catch { setError('Lỗi kết nối'); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa ca "${name}"?`)) return;
    try { await fetch(`/api/shifts/${id}`, { method: 'DELETE' }); fetchShifts(); } catch { /* ignore */ }
  };

  const fmtRate = (r: number) => new Intl.NumberFormat('vi-VN').format(r) + 'đ/h';

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-500">Tổng: {shifts.length} ca làm việc</p>
        <button onClick={openCreate} className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow transition-colors">
          Thêm ca
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200 w-10">#</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Tên ca</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Loại</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Giờ bắt đầu</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Giờ kết thúc</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Grace</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Tăng ca</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-10 text-gray-400">Đang tải...</td></tr>}
              {!loading && shifts.length === 0 && <tr><td colSpan={8} className="text-center py-10 text-gray-400">Chưa có ca nào</td></tr>}
              {shifts.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 border-b border-slate-100">{i + 1}</td>
                  <td className="px-4 py-3 border-b border-slate-100 font-semibold">{s.name}</td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.type === 'regular' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                      {s.type === 'regular' ? 'Chính' : 'Ngoài giờ'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100">{s.start_time.slice(0, 5)}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{s.end_time.slice(0, 5)}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{s.grace_minutes} phút</td>
                  <td className="px-4 py-3 border-b border-slate-100">{fmtRate(s.overtime_rate)}</td>
                  <td className="px-4 py-3 border-b border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(s)} className="px-2.5 py-1 rounded-md text-[12.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">Sửa</button>
                      <button onClick={() => handleDelete(s.id, s.name)} className="px-2.5 py-1 rounded-md text-[12.5px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors cursor-pointer">Xóa</button>
                    </div>
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-none cursor-pointer">✕</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              {error && <div className="text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên ca *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ca 7:00-17:00"
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Loại ca</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none">
                  <option value="regular">Ca chính (hành chính)</option>
                  <option value="extra">Ca ngoài giờ</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ bắt đầu</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ kết thúc</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Grace (phút)</label>
                  <input type="number" value={form.grace_minutes} onChange={e => setForm({ ...form, grace_minutes: e.target.value })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tăng ca (đ/h)</label>
                  <input type="number" value={form.overtime_rate} onChange={e => setForm({ ...form, overtime_rate: e.target.value })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer">Hủy</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#2e8b57] hover:bg-[#246e45] shadow cursor-pointer disabled:opacity-50">
                {saving ? 'Đang lưu...' : editId ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
