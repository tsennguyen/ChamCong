'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTodayString } from '@/lib/utils';

interface AttendanceRow {
  id: string; user_id: string; attendance_date: string;
  check_in_time: string | null; check_out_time: string | null;
  late_minutes: number; overtime_minutes: number; overtime_amount: number;
  status: string; shift_type: string;
  check_in_note?: string | null;
  check_out_note?: string | null;
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

  const statusBadge = (s: string, isInsufficient = false, isForgot = false) => {
    if (isForgot) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          Quên check-out
        </span>
      );
    }
    if (isInsufficient) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          Không đủ giờ (0 công)
        </span>
      );
    }
    switch (s) {
      case 'checked_out':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Hợp lệ (Đã về)
          </span>
        );
      case 'checked_in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Đang làm việc
          </span>
        );
      case 'needs_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Cần xác nhận
          </span>
        );
      default:
        return <span className="text-gray-400 text-xs">{s}</span>;
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
    <div className="space-y-5">
      {/* Date filter & Summary Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#eef2f0] shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap">Chọn ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="h-10 px-3 border border-[#d8e3dc] rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#2e8b57] bg-[#f8faf9] focus:bg-white"
          />
          <button
            onClick={fetchData}
            className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer border-none"
          >
            Tải lại
          </button>
        </div>
        <p className="text-xs sm:text-sm font-semibold text-gray-500">
          <strong className="text-gray-900">{records.length}</strong> ca làm việc — {fmtDate(selectedDate)}
        </p>
      </div>

      {/* Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-[#eef2f0] shadow-sm overflow-hidden">
        {/* Desktop Table (>= 768px) */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#f8faf9] border-b border-[#eef2f0] text-gray-700 font-bold uppercase tracking-wider">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Giáo viên</th>
                <th className="px-4 py-3">Ca làm việc</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Trễ</th>
                <th className="px-4 py-3">Tăng ca</th>
                <th className="px-4 py-3">Tiền TC</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 min-w-[180px]">Ghi chú / Tình trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f1] font-medium">
              {loading && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    Không có dữ liệu ngày {fmtDate(selectedDate)}
                  </td>
                </tr>
              )}
              {records.map((r, i) => {
                const noteText = r.check_out_note || (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '—');
                const isForgot = r.status === 'needs_review' || (r.check_out_note || '').includes('Quên check-out');
                const isInsufficient = !isForgot && noteText.includes('Không đủ giờ');
                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-[#f9fbf9] transition-colors ${
                      isForgot ? 'bg-amber-50/40' : isInsufficient ? 'bg-rose-50/40' : r.status === 'needs_review' ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400 font-semibold">{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                      {getTitle(r.user?.gender)} {r.user?.full_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">
                      {r.shift?.name || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{fmtTime(r.check_in_time)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{fmtTime(r.check_out_time)}</td>
                    <td className="px-4 py-3">
                      {r.late_minutes > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {r.late_minutes}p
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.overtime_minutes > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          +{r.overtime_minutes}p
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.overtime_amount > 0 ? (
                        <span className="font-bold text-indigo-700">
                          {new Intl.NumberFormat('vi-VN').format(r.overtime_amount)}đ
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{statusBadge(r.status, isInsufficient, isForgot)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[11px] leading-tight font-medium ${
                          isInsufficient 
                            ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200' 
                            : noteText.includes('Về sớm') 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : noteText.includes('Đủ giờ') 
                                ? 'bg-emerald-100 text-emerald-800 font-semibold' 
                                : 'bg-[#f0f4f1] text-gray-600'
                        }`}
                      >
                        {noteText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View (< 768px) */}
        <div className="md:hidden divide-y divide-[#f0f4f1]">
          {loading && (
            <div className="text-center py-12 text-gray-400 text-xs">
              Đang tải dữ liệu...
            </div>
          )}
          {!loading && records.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-xs">
              Không có dữ liệu ngày {fmtDate(selectedDate)}
            </div>
          )}
          {records.map((r, i) => {
            const noteText = r.check_out_note || (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '—');
            const isForgot = r.status === 'needs_review' || (r.check_out_note || '').includes('Quên check-out');
            const isInsufficient = !isForgot && noteText.includes('Không đủ giờ');
            return (
              <div
                key={r.id}
                className={`p-3.5 flex flex-col gap-2.5 transition-all ${
                  isForgot ? 'bg-amber-50/40' : isInsufficient ? 'bg-rose-50/40' : r.status === 'needs_review' ? 'bg-amber-50/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#f0f4f1] text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-bold text-gray-900 text-sm">
                        {getTitle(r.user?.gender)} {r.user?.full_name}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 ml-6.5 font-medium">
                      Ca: <span className="font-semibold text-gray-800">{r.shift?.name || '—'}</span>
                    </div>
                  </div>
                  <div>{statusBadge(r.status, isInsufficient, isForgot)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-[#eef2f0] flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vào ca</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-bold text-gray-800">{fmtTime(r.check_in_time)}</span>
                      {r.late_minutes > 0 && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                          Trễ {r.late_minutes}p
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-[#eef2f0] flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ra ca</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-bold text-gray-800">{fmtTime(r.check_out_time)}</span>
                      {r.overtime_minutes > 0 && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">
                          +{r.overtime_minutes}p
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-[#f4f7f5]">
                  {r.overtime_amount > 0 ? (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      TC: +{new Intl.NumberFormat('vi-VN').format(r.overtime_amount)}đ
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">Không tăng ca</span>
                  )}

                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md font-medium truncate max-w-[200px] ${
                      isInsufficient 
                        ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200' 
                        : noteText.includes('Về sớm') 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : noteText.includes('Đủ giờ') 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-[#f0f4f1] text-gray-600'
                    }`}
                  >
                    {noteText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
