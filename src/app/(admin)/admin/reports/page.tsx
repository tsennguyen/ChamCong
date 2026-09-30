'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentMonthString } from '@/lib/utils';

interface TeacherReport {
  user: {
    id: string;
    full_name: string;
    gender: string;
    email: string;
    role?: string;
  };
  days_worked: number;
  insufficient_count: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
  total_overtime_amount: number;
  extra_sessions_count: number;
}

export default function ReportsPage() {
  const currentMonth = getCurrentMonthString(); // Vietnam timezone current month
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [report, setReport] = useState<TeacherReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?month=${selectedMonth}`);
      const data = await res.json();
      setReport(data.report || []);
    } catch {}
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const totalDays = report.reduce((sum, r) => sum + r.days_worked, 0);
  const totalLate = report.reduce((sum, r) => sum + r.total_late_minutes, 0);
  const totalOT = report.reduce((sum, r) => sum + r.total_overtime_minutes, 0);
  const totalOTAmount = report.reduce((sum, r) => sum + r.total_overtime_amount, 0);

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  const getTitle = (g?: string) => (g === 'male' ? 'Thầy' : 'Cô');

  const handleExportCSV = () => {
    const headers = ['STT', 'Giáo viên', 'Email', 'Ngày công chuẩn', 'Không đủ giờ (0 công)', 'Phút trễ', 'Phút tăng ca', 'Ca ngoài giờ', 'Tiền tăng ca (VNĐ)'];
    const rows = report.map((r, i) => [
      i + 1,
      `${getTitle(r.user.gender)} ${r.user.full_name}`,
      r.user.email,
      r.days_worked,
      r.insufficient_count || 0,
      r.total_late_minutes,
      r.total_overtime_minutes,
      r.extra_sessions_count,
      r.total_overtime_amount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bao_Cao_Cham_Cong_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Month Filter & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#eef2f0] shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap">Chọn tháng:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 border border-[#d8e3dc] rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#2e8b57] bg-[#f8faf9] focus:bg-white"
          />
          <button
            onClick={fetchReport}
            className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer border-none"
          >
            Xem
          </button>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={report.length === 0}
          className="bg-white border border-[#d8e3dc] text-gray-700 hover:text-emerald-800 hover:bg-emerald-50/50 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          Xuất file CSV (Excel)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#eef2f0] flex flex-col justify-between">
          <span className="text-gray-500 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Tổng giáo viên</span>
          <div className="text-2xl sm:text-3xl font-black text-[#1e6b3e] mt-1">{report.length}</div>
          <span className="text-xs text-gray-400 font-medium mt-1">Đang tính công tháng này</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-[#d2ead8] bg-gradient-to-br from-white via-white to-emerald-50/40 flex flex-col justify-between">
          <span className="text-emerald-700 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Tổng ngày công</span>
          <div className="text-2xl sm:text-3xl font-black text-[#1e6b3e] mt-1">{totalDays} công</div>
          <span className="text-xs text-emerald-600 font-medium mt-1">Tất cả giáo viên</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-200 bg-gradient-to-br from-white via-white to-amber-50/40 flex flex-col justify-between">
          <span className="text-amber-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Tổng phút đi trễ</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">{totalLate} phút</div>
          <span className="text-xs text-gray-400 font-medium mt-1">Ghi nhận trong tháng</span>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/40 flex flex-col justify-between">
          <span className="text-indigo-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider">Tiền tăng ca tích lũy</span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700 mt-1">{fmtCurrency(totalOTAmount)}</div>
          <span className="text-xs text-indigo-600 font-medium mt-1">{totalOT} phút tăng ca</span>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#eef2f0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#eef2f0] flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">Bảng tổng hợp công tháng {selectedMonth}</h3>
          <span className="text-xs text-gray-500 font-medium">Đơn giá: 40.000đ/giờ</span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#f8faf9] text-gray-700 font-bold uppercase tracking-wider border-b border-[#eef2f0]">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Giáo viên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-center">Ngày công chuẩn</th>
                <th className="px-4 py-3 text-center">Không đủ giờ</th>
                <th className="px-4 py-3 text-center">Phút trễ</th>
                <th className="px-4 py-3 text-center">Tăng ca (phút)</th>
                <th className="px-4 py-3 text-center">Ca ngoài giờ</th>
                <th className="px-4 py-3 text-right">Tiền tăng ca</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f1] font-medium">
              {loading && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Đang tổng hợp số liệu...</td></tr>
              )}
              {!loading && report.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Không có dữ liệu trong tháng {selectedMonth}</td></tr>
              )}
              {report.map((r, i) => (
                <tr key={r.user.id} className="hover:bg-[#f9fbf9] transition-colors">
                  <td className="px-4 py-3.5 text-gray-400 font-semibold">{i + 1}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-900 whitespace-nowrap">
                    {getTitle(r.user.gender)} {r.user.full_name}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{r.user.email}</td>
                  <td className="px-4 py-3.5 text-center font-bold text-[#1e6b3e]">
                    {r.days_worked}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.insufficient_count > 0 ? (
                      <span className="text-rose-800 font-bold bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full text-xs" title="Không tính công">
                        {r.insufficient_count} ca
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.total_late_minutes > 0 ? (
                      <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-xs">
                        {r.total_late_minutes}p
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {r.total_overtime_minutes > 0 ? (
                      <span className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full text-xs">
                        +{r.total_overtime_minutes}p
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-gray-700">
                    {r.extra_sessions_count}
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-indigo-700">
                    {fmtCurrency(r.total_overtime_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
