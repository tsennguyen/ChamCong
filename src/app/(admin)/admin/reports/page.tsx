'use client';

import { useState, useEffect, useCallback } from 'react';

interface TeacherReport {
  user: {
    id: string;
    full_name: string;
    gender: string;
    email: string;
  };
  days_worked: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
  total_overtime_amount: number;
  extra_sessions_count: number;
}

export default function ReportsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
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
    const headers = ['STT', 'Giáo viên', 'Email', 'Ngày công', 'Phút trễ', 'Phút tăng ca', 'Ca ngoài giờ', 'Tiền tăng ca (VNĐ)'];
    const rows = report.map((r, i) => [
      i + 1,
      `${getTitle(r.user.gender)} ${r.user.full_name}`,
      r.user.email,
      r.days_worked,
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
    <div className="space-y-6">
      {/* Month Filter & Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Chọn tháng:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
          />
          <button
            onClick={fetchReport}
            className="bg-[#2e8b57] text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#246e45] transition-colors"
          >
            🔄 Xem
          </button>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={report.length === 0}
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
        >
          📥 Xuất file CSV (Excel)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200">
          <span className="text-gray-500 text-xs font-semibold uppercase">Tổng giáo viên</span>
          <div className="text-2xl font-extrabold text-[#2e8b57] mt-1">{report.length}</div>
          <span className="text-xs text-gray-400">Đang tính công tháng này</span>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200">
          <span className="text-gray-500 text-xs font-semibold uppercase">Tổng ngày công</span>
          <div className="text-2xl font-extrabold text-[#2e8b57] mt-1">{totalDays} công</div>
          <span className="text-xs text-gray-400">Tất cả giáo viên</span>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200">
          <span className="text-gray-500 text-xs font-semibold uppercase">Tổng phút đi trễ</span>
          <div className="text-2xl font-extrabold text-red-600 mt-1">{totalLate} phút</div>
          <span className="text-xs text-gray-400">Ghi nhận trong tháng</span>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200">
          <span className="text-gray-500 text-xs font-semibold uppercase">Tiền tăng ca tích lũy</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">{fmtCurrency(totalOTAmount)}</div>
          <span className="text-xs text-gray-400">{totalOT} phút tăng ca</span>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Bảng tổng hợp công tháng {selectedMonth}</h3>
          <span className="text-xs text-gray-500">Đơn giá: 40.000đ/giờ</span>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200 w-10">#</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Giáo viên</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Email</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200 text-center">Ngày công</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200 text-center">Phút trễ</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200 text-center">Tăng ca (phút)</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200 text-center">Ca ngoài giờ</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200 text-right">Tiền tăng ca</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Đang tổng hợp số liệu...</td></tr>
              )}
              {!loading && report.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Không có dữ liệu trong tháng {selectedMonth}</td></tr>
              )}
              {report.map((r, i) => (
                <tr key={r.user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3.5 border-b border-slate-100">{i + 1}</td>
                  <td className="px-4 py-3.5 border-b border-slate-100 font-semibold whitespace-nowrap">
                    {getTitle(r.user.gender)} {r.user.full_name}
                  </td>
                  <td className="px-4 py-3.5 border-b border-slate-100 text-gray-500 text-xs">{r.user.email}</td>
                  <td className="px-4 py-3.5 border-b border-slate-100 text-center font-bold text-[#2e8b57]">
                    {r.days_worked}
                  </td>
                  <td className="px-4 py-3.5 border-b border-slate-100 text-center">
                    {r.total_late_minutes > 0 ? (
                      <span className="text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded text-xs">
                        {r.total_late_minutes} phút
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-slate-100 text-center">
                    {r.total_overtime_minutes > 0 ? (
                      <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded text-xs">
                        +{r.total_overtime_minutes} phút
                      </span>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="px-4 py-3.5 border-b border-slate-100 text-center text-gray-600">
                    {r.extra_sessions_count}
                  </td>
                  <td className="px-4 py-3.5 border-b border-slate-100 text-right font-bold text-blue-700">
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
