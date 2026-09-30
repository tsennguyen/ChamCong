'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTodayString } from '@/lib/utils';

interface AttendanceRow {
  id: string; user_id: string; attendance_date: string;
  check_in_time: string | null; check_out_time: string | null;
  late_minutes: number; overtime_minutes: number; overtime_amount: number;
  status: string; shift_type: string;
  user?: { id: string; full_name: string; gender: string };
  shift?: { id: string; name: string; type: string };
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmtTime = (t: string | null) => t ? new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const getTitle = (g?: string) => g === 'male' ? 'Thầy' : 'Cô';

  const statusBadge = (s: string) => {
    switch (s) {
      case 'checked_out': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">Đã check-out</span>;
      case 'checked_in': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Đã check-in</span>;
      case 'needs_review': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Cần xác nhận</span>;
      default: return <span className="text-gray-400 text-xs">{s}</span>;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa bản ghi này?')) return;
    try {
      await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <>
      {/* Date filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="h-10 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
          />
          <button onClick={fetchData} className="bg-[#2e8b57] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#246e45] transition-colors">
            Tải lại
          </button>
        </div>
        <p className="text-sm text-gray-500">{records.length} bản ghi — {fmtDate(selectedDate)}</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200 w-10">#</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Giáo viên</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Ca</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Check-in</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Check-out</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Trễ</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Tăng ca</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Tiền TC</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b-[1.5px] border-slate-200">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="text-center py-10 text-gray-400">Đang tải...</td></tr>}
              {!loading && records.length === 0 && <tr><td colSpan={9} className="text-center py-10 text-gray-400">Không có dữ liệu ngày {fmtDate(selectedDate)}</td></tr>}
              {records.map((r, i) => (
                <tr key={r.id} className={`hover:bg-slate-50 ${r.status === 'needs_review' ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3 border-b border-slate-100">{i + 1}</td>
                  <td className="px-4 py-3 border-b border-slate-100 font-semibold whitespace-nowrap">{getTitle(r.user?.gender)} {r.user?.full_name}</td>
                  <td className="px-4 py-3 border-b border-slate-100 whitespace-nowrap">{r.shift?.name || '—'}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{fmtTime(r.check_in_time)}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{fmtTime(r.check_out_time)}</td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    {r.late_minutes > 0 ? <span className="text-red-600 font-semibold">{r.late_minutes} phút</span> : '0'}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100">{r.overtime_minutes > 0 ? `${r.overtime_minutes} phút` : '—'}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{r.overtime_amount > 0 ? `${new Intl.NumberFormat('vi-VN').format(r.overtime_amount)}đ` : '—'}</td>
                  <td className="px-4 py-3 border-b border-slate-100">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
