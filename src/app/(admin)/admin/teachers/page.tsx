'use client';

import { useState, useEffect, useCallback } from 'react';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

interface Teacher {
  id: string; email: string; full_name: string; gender: string;
  phone: string | null; role: string; is_active: boolean;
  must_change_password: boolean; created_at: string;
  shift_assignments?: Array<{
    id: string;
    shift_id: string;
    is_active: boolean;
    shift?: { id: string; name: string; start_time: string; end_time: string };
  }>;
}

interface TeacherForm {
  email: string; full_name: string; gender: string;
  phone: string; password: string; role: 'teacher' | 'admin';
  shift_ids: string[];
}

const emptyForm: TeacherForm = {
  email: '', full_name: '', gender: 'female', phone: '', password: '', role: 'teacher',
  shift_ids: [],
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
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

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts');
      const data = await res.json();
      setAllShifts(Array.isArray(data) ? data.filter((s: Shift) => s.is_active !== false) : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchShifts();
  }, [fetchTeachers, fetchShifts]);

  const openCreate = () => {
    setEditId(null);
    setForm({
      ...emptyForm,
      shift_ids: allShifts.map(s => s.id),
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditId(t.id);
    const assignedIds = (t.shift_assignments || [])
      .filter(a => a.is_active && a.shift_id)
      .map(a => a.shift_id);
    setForm({
      email: t.email,
      full_name: t.full_name,
      gender: t.gender,
      phone: t.phone || '',
      password: '',
      role: (t.role as 'teacher' | 'admin') || 'teacher',
      shift_ids: assignedIds,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.email || !form.full_name) { setError('Vui lòng nhập đầy đủ'); return; }
    if (!editId && !form.password) { setError('Vui lòng nhập mật khẩu'); return; }
    setSaving(true); setError('');

    try {
      const url = editId ? `/api/teachers/${editId}` : '/api/teachers';
      const method = editId ? 'PUT' : 'POST';
      const body: Record<string, any> = {
        email: form.email,
        full_name: form.full_name,
        gender: form.gender,
        phone: form.phone,
        role: form.role,
        shift_ids: form.shift_ids,
      };
      if (form.password) body.password = form.password;

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Lỗi'); setSaving(false); return; }
      setModalOpen(false);
      fetchTeachers();
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#eef2f0] shadow-sm">
        <div>
          <p className="text-xs sm:text-sm font-semibold text-gray-500">
            Tổng cộng: <strong className="text-gray-900">{teachers.length}</strong> giáo viên trong trường
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer border-none"
        >
          + Thêm giáo viên
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#eef2f0] overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#f8faf9] text-gray-700 font-bold uppercase tracking-wider border-b border-[#eef2f0]">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Giới tính</th>
                <th className="px-4 py-3">SĐT</th>
                <th className="px-4 py-3">Ca làm việc</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f1] font-medium">
              {loading && <tr><td colSpan={9} className="text-center py-12 text-gray-400">Đang tải...</td></tr>}
              {!loading && teachers.length === 0 && <tr><td colSpan={9} className="text-center py-12 text-gray-400">Chưa có giáo viên nào</td></tr>}
              {teachers.map((t, i) => (
                <tr key={t.id} className="hover:bg-[#f9fbf9] transition-colors">
                  <td className="px-4 py-3 text-gray-400 font-semibold">{i + 1}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                    {t.gender === 'male' ? 'Thầy' : 'Cô'} {t.full_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">{t.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${t.role === 'admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                      {t.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.gender === 'male' ? 'Nam' : 'Nữ'}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{t.phone || '—'}</td>
                  <td className="px-4 py-3">
                    {(!t.shift_assignments || t.shift_assignments.length === 0) ? (
                      <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-semibold">Chưa gán ca</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {t.shift_assignments
                          .filter(a => a.is_active && a.shift)
                          .map(a => (
                            <span key={a.id} className="text-[11px] bg-[#eef7ee] text-[#1e6b3e] font-bold px-2 py-0.5 rounded-md border border-[#cbe4cb] whitespace-nowrap">
                              {a.shift?.name}
                            </span>
                          ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(t)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold cursor-pointer border-none transition-colors ${t.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {t.is_active ? '● Hoạt động' : '○ Tạm khóa'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(t)} className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">Sửa</button>
                      <button onClick={() => handleDelete(t.id, t.full_name)} className="px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer">Xóa</button>
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{editId ? 'Sửa thông tin giáo viên' : 'Thêm giáo viên mới'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
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
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none bg-white">
                    <option value="female">Cô giáo (Nữ)</option>
                    <option value="male">Thầy giáo (Nam)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vai trò</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'teacher' | 'admin' })}
                    className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none bg-white">
                    <option value="teacher">Giáo viên</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901234567"
                  className="w-full h-11 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57] focus:shadow-[0_0_0_3px_rgba(46,139,87,0.15)]" />
              </div>

              {/* Ca làm việc */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phân công ca làm việc (chọn 1 hoặc nhiều ca)
                </label>
                <div className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {allShifts.length === 0 ? (
                    <span className="text-xs text-gray-400">Chưa có ca làm việc nào</span>
                  ) : (
                    allShifts.map((s) => {
                      const checked = form.shift_ids.includes(s.id);
                      return (
                        <label key={s.id} className="flex items-center gap-2.5 text-sm cursor-pointer hover:text-[#2e8b57]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, shift_ids: [...form.shift_ids, s.id] });
                              } else {
                                setForm({ ...form, shift_ids: form.shift_ids.filter((id) => id !== s.id) });
                              }
                            }}
                            className="w-4 h-4 rounded text-[#2e8b57] focus:ring-[#2e8b57] cursor-pointer"
                          />
                          <span className="font-medium text-gray-800">{s.name}</span>
                          <span className="text-xs text-gray-400">({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})</span>
                        </label>
                      );
                    })
                  )}
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
    </div>
  );
}
