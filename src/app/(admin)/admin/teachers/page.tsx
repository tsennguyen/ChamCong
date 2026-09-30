'use client';

import { useState, useEffect, useCallback } from 'react';

interface Teacher {
  id: string; email: string; full_name: string; gender: string;
  phone: string | null; role: string; is_active: boolean;
  must_change_password: boolean; created_at: string;
}

interface TeacherForm {
  email: string; full_name: string; gender: string;
  phone: string; password: string;
}

const emptyForm: TeacherForm = { email: '', full_name: '', gender: 'female', phone: '', password: '' };

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      setTeachers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setError(''); setModalOpen(true); };
  const openEdit = (t: Teacher) => {
    setEditId(t.id);
    setForm({ email: t.email, full_name: t.full_name, gender: t.gender, phone: t.phone || '', password: '' });
    setError(''); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.email || !form.full_name) { setError('Vui lòng nhập đầy đủ'); return; }
    if (!editId && !form.password) { setError('Vui lòng nhập mật khẩu'); return; }
    setSaving(true); setError('');

    try {
      const url = editId ? `/api/teachers/${editId}` : '/api/teachers';
      const method = editId ? 'PUT' : 'POST';
      const body: Record<string, string> = { email: form.email, full_name: form.full_name, gender: form.gender, phone: form.phone };
      if (form.password) body.password = form.password;

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Lỗi'); setSaving(false); return; }
      setModalOpen(false); fetchTeachers();
    } catch { setError('Lỗi kết nối'); }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa giáo viên ${name}?`)) return;
    try {
      await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      fetchTeachers();
    } catch { /* ignore */ }
  };

  const handleToggle = async (t: Teacher) => {
    try {
      await fetch(`/api/teachers/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      fetchTeachers();
    } catch { /* ignore */ }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Tổng: {teachers.length} giáo viên</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow transition-colors"
        >
          ➕ Thêm giáo viên
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200 w-10">#</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Họ tên</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Email</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Giới tính</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">SĐT</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Trạng thái</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Đang tải...</td></tr>}
              {!loading && teachers.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Chưa có giáo viên nào</td></tr>}
              {teachers.map((t, i) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 border-b border-slate-100">{i + 1}</td>
                  <td className="px-4 py-3 border-b border-slate-100 font-semibold whitespace-nowrap">
                    {t.gender === 'male' ? 'Thầy' : 'Cô'} {t.full_name}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100">{t.email}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{t.gender === 'male' ? 'Nam' : 'Nữ'}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{t.phone || '—'}</td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    <button onClick={() => handleToggle(t)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-semibold cursor-pointer border-none ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.is_active ? '● Hoạt động' : '○ Tạm khóa'}
                    </button>
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(t)} className="px-2.5 py-1 rounded-md text-[12.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">Sửa</button>
                      <button onClick={() => handleDelete(t.id, t.full_name)} className="px-2.5 py-1 rounded-md text-[12.5px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-colors cursor-pointer">Xóa</button>
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
              <h3 className="text-lg font-bold text-gray-900">{editId ? '✏️ Sửa giáo viên' : '➕ Thêm giáo viên mới'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {error && <div className="text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Họ tên *</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nguyễn Thị Hạnh"
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="hanh@lumi.edu.vn" type="email"
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giới tính</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none">
                    <option value="female">Nữ</option>
                    <option value="male">Nam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SĐT</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901234567"
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{editId ? 'Đổi mật khẩu (bỏ trống = giữ)' : 'Mật khẩu *'}</label>
                <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? '••••••' : 'Mật khẩu ban đầu'} type="password"
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]" />
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
