'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  getTodayString,
  getCurrentMonthString,
  getCurrentYearString,
  formatTime,
  formatDate,
} from '@/lib/utils';

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
  check_in_note?: string | null;
  check_out_note?: string | null;
  user?: { id: string; full_name: string; gender: string };
  shift?: { id: string; name: string; type: string; start_time: string; end_time: string };
}

type PeriodType = 'today' | 'month' | 'quarter' | 'year';

const PIE_COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b'];

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Period filters
  const [period, setPeriod] = useState<PeriodType>('today');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [selectedYear, setSelectedYear] = useState(parseInt(getCurrentYearString(), 10) || 2026);
  const [selectedQuarter, setSelectedQuarter] = useState(() => {
    const currentMonthNum = parseInt(getCurrentMonthString().split('-')[1] || '10', 10);
    return Math.ceil(currentMonthNum / 3);
  });

  // Table filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShiftType, setFilterShiftType] = useState<'all' | 'regular' | 'overtime'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'insufficient' | 'forgot' | 'late' | 'overtime' | 'working'>('all');

  const todayStr = getTodayString();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compute query URL based on period
  const queryUrl = useMemo(() => {
    if (period === 'today') {
      return `/api/attendance?date=${todayStr}`;
    }
    if (period === 'month') {
      return `/api/attendance?month=${selectedMonth}`;
    }
    if (period === 'quarter') {
      const qStartMonth = String((selectedQuarter - 1) * 3 + 1).padStart(2, '0');
      const qEndMonth = String(selectedQuarter * 3).padStart(2, '0');
      const endDay = [3, 12].includes(selectedQuarter * 3) ? '31' : '30';
      const from = `${selectedYear}-${qStartMonth}-01`;
      const to = `${selectedYear}-${qEndMonth}-${endDay}`;
      return `/api/attendance?from=${from}&to=${to}`;
    }
    if (period === 'year') {
      return `/api/attendance?from=${selectedYear}-01-01&to=${selectedYear}-12-31`;
    }
    return `/api/attendance?date=${todayStr}`;
  }, [period, todayStr, selectedMonth, selectedQuarter, selectedYear]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(queryUrl);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      // ignore error
    } finally {
      setLoading(false);
    }
  }, [queryUrl]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Derived KPI calculations
  const totalShifts = records.length;
  const regularCount = records.filter(r => r.shift_type === 'regular' || r.shift?.type === 'regular').length;
  const overtimeShiftCount = records.filter(r => r.shift_type === 'overtime' || r.shift?.type === 'overtime').length;

  const insufficientRecords = records.filter(r => {
    const note = r.check_out_note || '';
    return note.includes('Không đủ giờ');
  });

  const validCheckedOut = records.filter(r => {
    return r.status === 'checked_out' && !(r.check_out_note || '').includes('Không đủ giờ');
  });

  const currentlyWorking = records.filter(r => r.status === 'checked_in');
  const lateRecords = records.filter(r => (r.late_minutes || 0) > 0);
  const totalLateMinutes = records.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
  const overtimeRecords = records.filter(r => (r.overtime_minutes || 0) > 0);
  const totalOTMinutes = records.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);
  const totalOTAmount = records.reduce((sum, r) => sum + (r.overtime_amount || 0), 0);

  // Grouped data for Charts
  const todayChartData = useMemo(() => {
    if (period !== 'today') return [];
    const teacherMap: Record<string, { name: string; shifts: number; late: number; ot: number }> = {};
    records.forEach(r => {
      const name = r.user?.full_name || 'Khác';
      if (!teacherMap[name]) {
        teacherMap[name] = { name, shifts: 0, late: 0, ot: 0 };
      }
      teacherMap[name].shifts += 1;
      if (r.late_minutes > 0) teacherMap[name].late += r.late_minutes;
      if (r.overtime_minutes > 0) teacherMap[name].ot += r.overtime_minutes;
    });
    return Object.values(teacherMap);
  }, [records, period]);

  const timelineChartData = useMemo(() => {
    if (period === 'today') return [];
    const dateMap: Record<string, { date: string; displayDate: string; valid: number; late: number; insufficient: number }> = {};
    records.forEach(r => {
      const d = r.attendance_date;
      if (!dateMap[d]) {
        const displayDate = d.slice(5); // MM-DD
        dateMap[d] = { date: d, displayDate, valid: 0, late: 0, insufficient: 0 };
      }
      const isInsuff = (r.check_out_note || '').includes('Không đủ giờ');
      if (isInsuff) {
        dateMap[d].insufficient += 1;
      } else if (r.status === 'checked_out') {
        dateMap[d].valid += 1;
      }
      if (r.late_minutes > 0) {
        dateMap[d].late += 1;
      }
    });
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [records, period]);

  const pieData = useMemo(() => {
    return [
      { name: 'Ca chuẩn đủ giờ', value: validCheckedOut.length },
      { name: 'Đang làm việc', value: currentlyWorking.length },
      { name: 'Không đủ giờ (0 công)', value: insufficientRecords.length },
      { name: 'Đi trễ ca chính', value: lateRecords.length },
    ].filter(item => item.value > 0);
  }, [validCheckedOut.length, currentlyWorking.length, insufficientRecords.length, lateRecords.length]);

  // Filtered records for table
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Teacher name search
      const name = (r.user?.full_name || '').toLowerCase();
      if (searchTerm && !name.includes(searchTerm.toLowerCase().trim())) {
        return false;
      }

      // Shift type filter
      const type = r.shift_type || r.shift?.type || 'regular';
      if (filterShiftType !== 'all' && type !== filterShiftType) {
        return false;
      }

      // Status/Quality filter
      const note = r.check_out_note || '';
      const isForgot = r.status === 'needs_review' || note.includes('Quên check-out');
      const isInsuff = !isForgot && note.includes('Không đủ giờ');
      if (filterStatus === 'valid' && (r.status !== 'checked_out' || isInsuff || isForgot)) return false;
      if (filterStatus === 'insufficient' && !isInsuff) return false;
      if (filterStatus === 'forgot' && !isForgot) return false;
      if (filterStatus === 'late' && (r.late_minutes || 0) <= 0) return false;
      if (filterStatus === 'overtime' && (r.overtime_minutes || 0) <= 0) return false;
      if (filterStatus === 'working' && r.status !== 'checked_in') return false;

      return true;
    });
  }, [records, searchTerm, filterShiftType, filterStatus]);

  const getTitle = (g?: string) => (g === 'male' ? 'Thầy' : 'Cô');

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return `Hôm nay (${formatDate(todayStr)})`;
      case 'month':
        return `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]}`;
      case 'quarter':
        return `Quý ${selectedQuarter}/${selectedYear}`;
      case 'year':
        return `Năm ${selectedYear}`;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header & Period Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4.5 sm:p-5 rounded-2xl border border-[#eef2f0] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Dữ liệu thời gian thực
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Tổng quan Chuyên cần
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Khoảng thời gian: <span className="font-bold text-[#1e6b3e]">{getPeriodLabel()}</span>
          </p>
        </div>

        {/* Period Selector Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Period Tabs */}
          <div className="inline-flex p-1 bg-[#f0f4f1] rounded-xl text-xs font-bold text-gray-600 border border-[#e2e8e3]">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                period === 'today' ? 'bg-[#2e8b57] text-white shadow-xs' : 'bg-transparent hover:text-gray-900 text-gray-600'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                period === 'month' ? 'bg-[#2e8b57] text-white shadow-xs' : 'bg-transparent hover:text-gray-900 text-gray-600'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setPeriod('quarter')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                period === 'quarter' ? 'bg-[#2e8b57] text-white shadow-xs' : 'bg-transparent hover:text-gray-900 text-gray-600'
              }`}
            >
              Quý
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer border-none ${
                period === 'year' ? 'bg-[#2e8b57] text-white shadow-xs' : 'bg-transparent hover:text-gray-900 text-gray-600'
              }`}
            >
              Năm
            </button>
          </div>

          {/* Conditional Sub-selectors */}
          {period === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#d8e3dc] rounded-xl outline-none focus:border-[#2e8b57]"
            />
          )}

          {period === 'quarter' && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedQuarter}
                onChange={e => setSelectedQuarter(parseInt(e.target.value, 10))}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-[#d8e3dc] rounded-xl outline-none focus:border-[#2e8b57]"
              >
                <option value={1}>Quý 1 (T1 - T3)</option>
                <option value={2}>Quý 2 (T4 - T6)</option>
                <option value={3}>Quý 3 (T7 - T9)</option>
                <option value={4}>Quý 4 (T10 - T12)</option>
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-[#d8e3dc] rounded-xl outline-none focus:border-[#2e8b57]"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {period === 'year' && (
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#d8e3dc] rounded-xl outline-none focus:border-[#2e8b57]"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          )}

          {/* Reload button */}
          <button
            onClick={fetchData}
            title="Làm mới dữ liệu"
            className="p-2 rounded-xl border border-[#d8e3dc] bg-white text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tổng lượt chấm công */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#eef2f0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500">
                Tổng ca
              </span>
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">{totalShifts}</span>
              <span className="text-xs font-semibold text-gray-500">lượt</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[#f4f7f5] flex items-center justify-between text-[11px] sm:text-xs text-gray-600">
            <span>Chính: <strong className="text-gray-800">{regularCount}</strong></span>
            <span>Ngoài giờ: <strong className="text-gray-800">{overtimeShiftCount}</strong></span>
          </div>
        </div>

        {/* Card 2: Ca hợp lệ (Tính công) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#d2ead8] bg-gradient-to-br from-white via-white to-emerald-50/50 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">
                Hợp lệ (Đủ công)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800">{validCheckedOut.length}</span>
              <span className="text-xs font-bold text-emerald-600">
                {totalShifts > 0 ? `(${Math.round((validCheckedOut.length / totalShifts) * 100)}%)` : ''}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100/70 flex items-center justify-between text-[11px] sm:text-xs text-gray-600">
            <span>Đang làm: <strong className="text-blue-700 font-bold">{currentlyWorking.length}</strong></span>
            <span className="text-emerald-700 font-semibold hidden sm:inline">Tính công chuẩn</span>
          </div>
        </div>

        {/* Card 3: Ca không đủ giờ (0 công) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 bg-gradient-to-br from-white via-white to-rose-50/50 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700">
                Không đủ giờ
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-rose-600">{insufficientRecords.length}</span>
              <span className="text-[11px] sm:text-xs font-bold text-rose-600">ca (0 công)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-[11px] sm:text-xs text-gray-500">
            <span>Dưới 30 phút</span>
            <span className="text-rose-600 font-bold hidden sm:inline">Không tính công</span>
          </div>
        </div>

        {/* Card 4: Đi trễ & Tăng ca */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-white via-white to-amber-50/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-800">
                Trễ &amp; Tăng ca
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-amber-700">{lateRecords.length}</span>
                <span className="text-[11px] sm:text-xs font-semibold text-gray-500 ml-1">lượt ({totalLateMinutes}p)</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100/70 flex items-center justify-between text-[11px] sm:text-xs">
            <span className="text-gray-600">TC: <strong className="text-indigo-700">+{totalOTMinutes}p</strong></span>
            <span className="text-indigo-700 font-black">
              {totalOTAmount > 0 ? `${new Intl.NumberFormat('vi-VN').format(totalOTAmount)}đ` : '0đ'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      {mounted && records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#eef2f0] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#1e6b3e] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  {period === 'today' ? 'Chuyên cần theo giáo viên (Hôm nay)' : 'Biểu đồ chấm công theo ngày'}
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">Đơn vị: lượt / phút</span>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                {period === 'today' ? (
                  <BarChart data={todayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f1" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="shifts" name="Số ca" fill="#2e8b57" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Trễ (phút)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ot" name="Tăng ca (phút)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4f1" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="valid" name="Hợp lệ (tính công)" fill="#2e8b57" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="insufficient" name="Không đủ giờ" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" name="Lượt đi trễ" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart / Shift Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-[#eef2f0] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Phân bổ chất lượng ca</h3>
              </div>
              <p className="text-xs text-gray-400">Tỷ lệ các trạng thái chấm công</p>
            </div>

            <div className="w-full h-52 my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#f4f7f5] text-xs">
              {pieData.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                    <span className="text-gray-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Table Section */}
      <div className="bg-white rounded-2xl border border-[#eef2f0] shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-[#eef2f0] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                Chi tiết dữ liệu chấm công ({filteredRecords.length}/{records.length} bản ghi)
              </h3>
              <p className="text-xs text-gray-500">
                Hiển thị danh sách check-in/out, phân loại ca và ghi chú tự động
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/reports"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1e6b3e] bg-[#eef7ee] hover:bg-[#e2f0e2] px-3.5 py-2 rounded-xl transition-colors border border-[#cbe4cb]"
              >
                Bảng lương &amp; Báo cáo
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên giáo viên..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-[#f8faf9] border border-[#e2e8e3] rounded-xl outline-none focus:bg-white focus:border-[#2e8b57] transition-all font-medium"
              />
            </div>

            {/* Shift Type Filter */}
            <div className="flex items-center gap-1 bg-[#f8faf9] border border-[#e2e8e3] rounded-xl px-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterShiftType}
                onChange={e => setFilterShiftType(e.target.value as any)}
                className="w-full bg-transparent py-2 text-xs outline-none text-gray-700 font-semibold cursor-pointer"
              >
                <option value="all">Tất cả loại ca</option>
                <option value="regular">Ca chính</option>
                <option value="overtime">Ca ngoài giờ</option>
              </select>
            </div>

            {/* Quality / Status Filter */}
            <div className="flex items-center gap-1 bg-[#f8faf9] border border-[#e2e8e3] rounded-xl px-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="w-full bg-transparent py-2 text-xs outline-none text-gray-700 font-semibold cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="valid">Đủ giờ làm (Hợp lệ)</option>
                <option value="insufficient">Không đủ giờ (0 công)</option>
                <option value="forgot">Quên check-out (Tự động đóng)</option>
                <option value="late">Có đi trễ</option>
                <option value="overtime">Có tăng ca</option>
                <option value="working">Đang làm việc (Chưa về)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Records Table (>= 768px) */}
        <div className="hidden md:block w-full overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#f8faf9] border-b border-[#eef2f0] text-gray-700 font-bold uppercase tracking-wider">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Giáo viên</th>
                <th className="px-4 py-3">Ca làm việc</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Trễ</th>
                <th className="px-4 py-3">Tăng ca</th>
                <th className="px-4 py-3">Tiền TC</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 min-w-[200px]">Ghi chú / Tình trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f1] font-medium">
              {loading && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2e8b57] mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              )}
              {!loading && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-gray-400">
                    Không tìm thấy bản ghi chấm công nào phù hợp.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredRecords.map((r, i) => {
                  const noteText =
                    r.check_out_note ||
                    (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '—');
                  const isForgot = r.status === 'needs_review' || noteText.includes('Quên check-out');
                  const isInsufficient = !isForgot && (noteText.includes('Không đủ giờ') || noteText.includes('Không đủ'));
                  const isRegular = r.shift_type === 'regular' || r.shift?.type === 'regular';

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-[#f9fbf9] transition-colors ${
                        isForgot ? 'bg-amber-50/40' : isInsufficient ? 'bg-rose-50/40' : r.status === 'checked_in' ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-400 font-semibold">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">
                        {formatDate(r.attendance_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-gray-900">
                          {getTitle(r.user?.gender)} {r.user?.full_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isRegular ? 'bg-[#2e8b57]' : 'bg-indigo-500'
                            }`}
                          ></span>
                          <span className="font-semibold text-gray-800">
                            {r.shift?.name || (isRegular ? 'Ca chính' : 'Ngoài giờ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{formatTime(r.check_in_time)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{formatTime(r.check_out_time)}</td>
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.status === 'checked_out' && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold ${
                            isInsufficient ? 'bg-rose-100 text-rose-800 border border-rose-200 font-bold' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isInsufficient ? 'Không đủ giờ (0 công)' : 'Hợp lệ (Đã về)'}
                          </span>
                        )}
                        {r.status === 'checked_in' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Đang làm việc
                          </span>
                        )}
                        {r.status === 'needs_review' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            {isForgot ? 'Quên check-out' : 'Cần xác nhận'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] leading-tight font-medium ${
                            isInsufficient
                              ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200'
                              : noteText.includes('Về sớm')
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : noteText.includes('Đủ giờ')
                              ? 'bg-emerald-100 text-emerald-800 font-semibold'
                              : 'bg-[#f0f4f1] text-gray-700'
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

        {/* Mobile-First Card View (< 768px) */}
        <div className="md:hidden divide-y divide-[#f0f4f1]">
          {loading && (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2e8b57] mb-2" />
              Đang tải dữ liệu...
            </div>
          )}
          {!loading && filteredRecords.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-xs">
              Không tìm thấy bản ghi chấm công nào phù hợp.
            </div>
          )}
          {!loading &&
            filteredRecords.map((r, i) => {
              const noteText =
                r.check_out_note ||
                (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '—');
              const isForgot = r.status === 'needs_review' || noteText.includes('Quên check-out');
              const isInsufficient = !isForgot && (noteText.includes('Không đủ giờ') || noteText.includes('Không đủ'));
              const isRegular = r.shift_type === 'regular' || r.shift?.type === 'regular';

              return (
                <div
                  key={r.id}
                  className={`p-3.5 flex flex-col gap-2.5 transition-all ${
                    isForgot ? 'bg-amber-50/40' : isInsufficient ? 'bg-rose-50/40' : r.status === 'checked_in' ? 'bg-blue-50/20' : ''
                  }`}
                >
                  {/* Header: Teacher Name, Date & Status */}
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
                      <div className="text-[11px] text-gray-500 mt-0.5 ml-6.5">
                        {formatDate(r.attendance_date)} • <span className="font-semibold text-gray-700">{r.shift?.name || (isRegular ? 'Ca chính' : 'Ngoài giờ')}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {r.status === 'checked_out' ? (
                      isInsufficient ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                          Không đủ giờ (0 công)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Hợp lệ (Đã về)
                        </span>
                      )
                    ) : r.status === 'checked_in' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Đang làm
                      </span>
                    ) : isForgot ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                        Quên check-out
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Cần xác nhận
                      </span>
                    )}
                  </div>

                  {/* Time boxes: In & Out */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-[#eef2f0] flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Vào ca</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-bold text-gray-800">{formatTime(r.check_in_time)}</span>
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
                        <span className="font-bold text-gray-800">{formatTime(r.check_out_time)}</span>
                        {r.overtime_minutes > 0 && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">
                            +{r.overtime_minutes}p
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Overtime & Note */}
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

