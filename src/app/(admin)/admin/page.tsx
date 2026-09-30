'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTodayString } from '@/lib/utils';

interface StatCard {
  icon: string;
  label: string;
  value: string | number;
  footnote: string;
  color: 'green' | 'red' | 'blue';
}

interface AttendanceRow {
  id: string;
  user_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number;
  overtime_minutes: number;
  overtime_amount: number;
  status: string;
  shift_type: string;
  user?: { id: string; full_name: string; gender: string };
  shift?: { id: string; name: string; type: string; start_time: string; end_time: string };
}

export default function AdminDashboard() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getTodayString();
  const todayFormatted = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance?date=${today}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [today]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const totalTeachers = records.length;
  const checkedOut = records.filter(r => r.status === 'checked_out').length;
  const lateCount = records.filter(r => r.late_minutes > 0).length;
  const totalOTMinutes = records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);

  const stats: StatCard[] = [
    { icon: '👩‍🏫', label: 'Đã chấm công', value: `${totalTeachers}`, footnote: 'Giáo viên check-in hôm nay', color: 'green' },
    { icon: '✅', label: 'Đã check-out', value: `${checkedOut}/${totalTeachers}`, footnote: `Tỷ lệ ${totalTeachers > 0 ? Math.round(checkedOut / totalTeachers * 100) : 0}%`, color: 'green' },
    { icon: '⏰', label: 'Đi trễ hôm nay', value: lateCount, footnote: 'Ghi nhận trễ ca chính', color: 'red' },
    { icon: '💰', label: 'Tăng ca hôm nay', value: `${totalOTMinutes} phút`, footnote: `≈ ${new Intl.NumberFormat('vi-VN').format(records.reduce((s, r) => s + (r.overtime_amount || 0), 0))}đ`, color: 'blue' },
  ];

  const colorMap = { green: 'text-[#2e8b57]', red: 'text-red-600', blue: 'text-blue-600' };
  const fmtTime = (t: string | null) => t ? new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const getTitle = (g?: string) => g === 'male' ? 'Thầy' : 'Cô';

  const statusBadge = (s: string) => {
    switch (s) {
      case 'checked_out': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-semibold bg-green-100 text-green-700">● Đã check-out</span>;
      case 'checked_in': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-semibold bg-blue-100 text-blue-700">● Đã check-in</span>;
      case 'needs_review': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-semibold bg-yellow-100 text-yellow-700">⚠️ Cần xác nhận</span>;
      default: return <span className="text-gray-400">{s}</span>;
    }
  };

  return (
    <>
      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-semibold">
              <span>{s.icon}</span><span>{s.label}</span>
            </div>
            <div className={`text-3xl font-extrabold leading-tight mt-1 ${colorMap[s.color]}`}>{s.value}</div>
            <div className="text-xs text-gray-400">{s.footnote}</div>
          </div>
        ))}
      </section>

      {/* Attendance Table */}
      <section className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-[17px] font-bold text-gray-900">Chấm công ngày {todayFormatted}</h2>
          <span className="bg-gray-100 text-sm px-2.5 py-1 rounded-md text-gray-600 font-medium hidden sm:inline">
            Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

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
              {loading && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
              )}
              {!loading && records.length === 0 && (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">Chưa có dữ liệu chấm công hôm nay</td></tr>
              )}
              {records.map((r, i) => {
                const isWarning = r.status === 'needs_review' || (!r.check_in_time && !r.check_out_time);
                return (
                  <tr key={r.id} className={`hover:bg-slate-50 ${isWarning ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3.5 border-b border-slate-100">{i + 1}</td>
                    <td className="px-4 py-3.5 border-b border-slate-100 font-semibold whitespace-nowrap">
                      {getTitle(r.user?.gender)} {r.user?.full_name}
                    </td>
                    <td className="px-4 py-3.5 border-b border-slate-100 whitespace-nowrap">{r.shift?.name || '—'}</td>
                    <td className="px-4 py-3.5 border-b border-slate-100">{fmtTime(r.check_in_time)}</td>
                    <td className="px-4 py-3.5 border-b border-slate-100">{fmtTime(r.check_out_time)}</td>
                    <td className="px-4 py-3.5 border-b border-slate-100">
                      {r.late_minutes > 0
                        ? <span className="text-red-600 font-semibold">{r.late_minutes} phút</span>
                        : '0'}
                    </td>
                    <td className="px-4 py-3.5 border-b border-slate-100">
                      {r.overtime_minutes > 0 ? `${r.overtime_minutes} phút` : '—'}
                    </td>
                    <td className="px-4 py-3.5 border-b border-slate-100">
                      {r.overtime_amount > 0 ? `${new Intl.NumberFormat('vi-VN').format(r.overtime_amount)}đ` : '—'}
                    </td>
                    <td className="px-4 py-3.5 border-b border-slate-100">{statusBadge(r.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
