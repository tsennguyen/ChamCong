'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  KeyRound,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  LogIn,
  LogOut,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { useWifiCheck } from '@/hooks/useWifiCheck';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { getGreeting } from '@/lib/greeting';
import { getTodayString, getCurrentMonthString, formatDate, formatTime } from '@/lib/utils';
import Image from 'next/image';
import RealtimeClock from '@/components/RealtimeClock';
import { PolicyModals, type PolicyType } from '@/components/PolicyModals';

interface Shift { id: string; name: string; type: string; start_time: string; end_time: string; }
interface TodayRecord {
  id: string; user_id: string; shift_id: string; attendance_date: string;
  check_in_time: string | null; check_out_time: string | null;
  late_minutes: number; overtime_minutes: number; overtime_amount?: number; status: string;
  check_in_note: string | null; check_out_note?: string | null; shift_type: string;
  user?: { id: string; full_name: string; gender: string };
  shift?: { id: string; name: string; type: string; start_time: string; end_time: string };
}

export default function TeacherPage() {
  const { user } = useAuth();
  const { isOnWifi: wifiOk, message: wifiMsg } = useWifiCheck();
  const fingerprint = useDeviceFingerprint();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [userNote, setUserNote] = useState('');
  const [regular, setRegular] = useState<TodayRecord[]>([]);
  const [extra, setExtra] = useState<TodayRecord[]>([]);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; time?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [network, setNetwork] = useState<{ allowed: boolean; client_ip: string; school_ssid: string } | null>(null);

  // Policy modal state
  const [policyModal, setPolicyModal] = useState<PolicyType>(null);

  // Monthly stats state
  const [monthRecords, setMonthRecords] = useState<TodayRecord[]>([]);
  const [showMonthHistory, setShowMonthHistory] = useState(false);

  const todayString = getTodayString();
  const currentMonthStr = getCurrentMonthString();
  const todayFormatted = formatDate(new Date());
  const greeting = user ? getGreeting(user.gender as 'male' | 'female', user.name || '') : '';

  // Fetch shifts
  useEffect(() => {
    fetch('/api/shifts/my-shifts')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) { setShifts(data); if (data.length > 0) setSelectedShift(data[0].id); } })
      .catch(() => {});
  }, []);

  // Fetch today stats with cache-busting
  const fetchToday = useCallback(() => {
    fetch(`/api/attendance/today?_t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setRegular(data.regular || []);
        setExtra(data.extra || []);
        if (data.network) setNetwork(data.network);
      })
      .catch(() => {});
  }, []);

  // Fetch monthly stats for current user
  const fetchMonthRecords = useCallback(() => {
    fetch(`/api/attendance?month=${currentMonthStr}&_t=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMonthRecords(data);
      })
      .catch(() => {});
  }, [currentMonthStr]);

  useEffect(() => {
    fetchToday();
    fetchMonthRecords();
    const iv = setInterval(() => {
      fetchToday();
    }, 15000);
    return () => clearInterval(iv);
  }, [fetchToday, fetchMonthRecords]);

  // Derived monthly calculations
  const validMonthDays = useMemo(() => {
    const dates = new Set(
      monthRecords
        .filter(r => r.status === 'checked_out' && !(r.check_out_note || '').includes('Không đủ giờ'))
        .map(r => r.attendance_date)
    );
    return dates.size;
  }, [monthRecords]);

  const totalMonthOTMinutes = useMemo(() => {
    return monthRecords.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0);
  }, [monthRecords]);

  const totalMonthOTAmount = useMemo(() => {
    return monthRecords.reduce((sum, r) => sum + (r.overtime_amount || 0), 0);
  }, [monthRecords]);

  const totalMonthLateMinutes = useMemo(() => {
    return monthRecords.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
  }, [monthRecords]);

  const myRecord = [...regular, ...extra].find(r => r.user_id === user?.id && r.shift_id === selectedShift);
  const isCheckedIn = !!myRecord;
  const isCheckedOut = isCheckedIn && myRecord.status === 'checked_out';
  const currentShift = shifts.find(s => s.id === selectedShift);

  const handleCheckin = async () => {
    if (!selectedShift) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: selectedShift,
          device_fingerprint: fingerprint,
          note: userNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const time = data.data?.attendance?.check_in_time ? formatTime(data.data.attendance.check_in_time) : '';
        setResult({ type: 'success', message: data.message, time });
        setUserNote('');
        fetchToday();
        fetchMonthRecords();
        setTimeout(() => { fetchToday(); fetchMonthRecords(); }, 800);
      } else {
        setResult({ type: 'error', message: data.error });
      }
    } catch { setResult({ type: 'error', message: 'Lỗi kết nối máy chủ' }); }
    setLoading(false);
  };

  const handleCheckout = async () => {
    if (!myRecord) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: myRecord.id,
          device_fingerprint: fingerprint,
          note: userNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const time = data.data?.attendance?.check_out_time ? formatTime(data.data.attendance.check_out_time) : '';
        setResult({ type: 'success', message: data.message, time });
        setUserNote('');
        fetchToday();
        fetchMonthRecords();
        setTimeout(() => { fetchToday(); fetchMonthRecords(); }, 800);
      } else {
        setResult({ type: 'error', message: data.error });
      }
    } catch { setResult({ type: 'error', message: 'Lỗi kết nối máy chủ' }); }
    setLoading(false);
  };

  const fmtTime = (t: string | null) => formatTime(t);
  const getTitle = (g?: string) => g === 'male' ? 'Thầy' : 'Cô';

  return (
    <div className="min-h-screen bg-[#f0f7f0] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-b border-[rgba(46,139,87,0.12)]">
        <div className="max-w-[800px] mx-auto px-3.5 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center gap-2">
          {/* Logo & School Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Image
              src="/logolumi.jpg"
              alt="Logo"
              width={42}
              height={42}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-[0_2px_6px_rgba(46,139,87,0.2)] object-cover shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-base sm:text-lg font-bold text-[#2e8b57] tracking-tight leading-tight truncate">
                LUMI Preschool
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-gray-500 truncate">
                Mầm Non Khai Minh
              </span>
            </div>
          </div>

          {/* Right Header: Greeting & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Greeting badge - PROMINENTLY VISIBLE ON MOBILE */}
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2 sm:px-3 py-1 rounded-full text-xs font-bold shadow-xs max-w-[130px] sm:max-w-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="truncate">{greeting || 'Giáo viên'}</span>
            </div>

            {/* Đổi mật khẩu */}
            <Link
              href="/change-password"
              className="flex items-center gap-1 border border-gray-200 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-gray-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
              title="Đổi mật khẩu tài khoản"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline font-medium">Đổi MK</span>
            </Link>

            {/* Thoát */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1 border border-gray-200 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5 text-gray-500 hover:text-red-500 shrink-0" />
              <span className="hidden sm:inline font-medium">Thoát</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[800px] w-full mx-auto px-3.5 sm:px-4 py-4 flex flex-col gap-4 sm:gap-5 flex-1">
        {/* Section 1: Check-in/out Hero Card */}
        <section className="bg-white rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-[#eef2f0] border-l-[5px] border-l-[#2e8b57]">
          {/* Header & Status Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#2e8b57] flex items-center gap-2">
                <span>Điểm danh giáo viên</span>
                {isCheckedOut ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Đã hoàn thành ca
                  </span>
                ) : isCheckedIn ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Đang trong ca
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Chưa vào ca
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {currentShift ? `Ca: ${currentShift.name} (${currentShift.start_time} - ${currentShift.end_time})` : 'Chọn ca làm việc'}
              </p>
            </div>

            {/* Quick shift status tag */}
            {isCheckedIn && myRecord && (
              <div className="text-xs text-gray-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 self-start sm:self-auto">
                Vào ca lúc: <strong className="text-emerald-700 font-bold">{fmtTime(myRecord.check_in_time)}</strong>
                {myRecord.late_minutes > 0 && (
                  <span className="text-rose-600 font-semibold ml-1">
                    (Trễ {myRecord.late_minutes}p)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Realtime Vietnam Clock */}
          <RealtimeClock />

          {/* Shift Selection */}
          <div className="mb-3.5">
            <label className="block text-xs sm:text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Lựa chọn ca làm việc</span>
              <span className="text-[11px] text-gray-400 font-normal">Chạm để đổi ca khác nếu có</span>
            </label>
            <div className="relative">
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                className="w-full h-12 border-[1.5px] border-emerald-600/30 rounded-xl px-3.5 pr-10 text-[14px] sm:text-[15px] font-semibold text-gray-800 bg-emerald-50/20 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
              >
                {shifts.length === 0 && <option>Chưa có ca nào được phân công</option>}
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start_time} - {s.end_time}) {s.type === 'overtime' ? '• Ngoài giờ' : '• Ca chính'}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-700">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* WiFi status */}
          {network ? (
            <div className={`flex items-start sm:items-center gap-2.5 text-xs sm:text-[13px] font-medium p-3 sm:px-3.5 sm:py-2.5 rounded-xl mb-3.5 transition-all ${
              network.allowed 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                : 'bg-red-50 text-red-700 border border-red-300'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 sm:mt-0 ${
                network.allowed ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
              }`} />
              <div className="flex-1 leading-relaxed">
                {network.allowed ? (
                  <span>
                    Đã kết nối đúng mạng trường: <strong>{network.school_ssid}</strong>. Bạn đã sẵn sàng điểm danh!
                  </span>
                ) : (
                  <span>
                    <strong>Không thể chấm công:</strong> Vui lòng kết nối vào WiFi của trường <strong>({network.school_ssid})</strong>. Mạng hiện tại (IP: {network.client_ip}) không hợp lệ.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl mb-3.5 bg-gray-50 text-gray-600 border border-gray-200">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
              <span>Đang kiểm tra WiFi trường học...</span>
            </div>
          )}

          {/* Optional Note Input (Only show when not checked out yet) */}
          {!isCheckedOut && (
            <div className="mb-4">
              <label className="block text-[12px] font-semibold text-gray-600 mb-1">
                Ghi chú {isCheckedIn ? 'khi ra về' : 'khi vào ca'} (không bắt buộc):
              </label>
              <input
                type="text"
                value={userNote}
                onChange={e => setUserNote(e.target.value)}
                placeholder={isCheckedIn ? "VD: Bàn giao bé cho phụ huynh, hoàn thành giáo án..." : "VD: Điểm danh vào ca..."}
                className="w-full h-10 px-3 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>
          )}

          {/* Mobile-First Big Contextual Action Buttons */}
          <div className="mb-3.5">
            {!isCheckedIn ? (
              /* Case 1: NOT CHECKED IN YET -> Big Green Check-in CTA Button */
              <button
                onClick={handleCheckin}
                disabled={loading || (network !== null && !network.allowed)}
                className="w-full h-14 bg-gradient-to-r from-[#2e8b57] to-[#257347] hover:brightness-105 active:scale-[0.99] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2.5 shadow-md shadow-emerald-900/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5 shrink-0" />
                )}
                <span>Điểm danh Vào Ca (Check-in)</span>
              </button>
            ) : !isCheckedOut ? (
              /* Case 2: IN SHIFT -> Big Red Check-out CTA Button */
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-rose-600 to-red-600 hover:brightness-105 active:scale-[0.99] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2.5 shadow-md shadow-rose-900/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5 shrink-0" />
                  )}
                  <span>Điểm danh Ra Về (Check-out)</span>
                </button>
                <p className="text-center text-[11.5px] text-gray-500">
                  Cô đang trong ca làm việc từ <strong>{fmtTime(myRecord?.check_in_time)}</strong>. Chúc cô một ngày dạy học thật nhiều niềm vui!
                </p>
              </div>
            ) : (
              /* Case 3: COMPLETED SHIFT TODAY -> Celebratory completion banner */
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm sm:text-base flex items-center gap-1.5">
                      <span>Đã hoàn tất ca {currentShift?.name || 'làm việc'}!</span>
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Vào ca: <strong>{fmtTime(myRecord?.check_in_time)}</strong> ➔ Ra về: <strong>{fmtTime(myRecord?.check_out_time)}</strong>
                      {myRecord?.overtime_minutes ? ` • Tăng ca: +${myRecord.overtime_minutes}p` : ''}
                    </p>
                  </div>
                </div>
                {myRecord?.check_out_note && (
                  <span className="text-[11.5px] font-semibold text-emerald-900 bg-white/80 border border-emerald-200 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                    {myRecord.check_out_note}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Result Alert Toast */}
          {result && (
            <div className={`relative overflow-hidden rounded-xl p-4 border transition-all shadow-sm ${
              result.type === 'success' 
                ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300 text-emerald-900' 
                : 'bg-gradient-to-r from-rose-50 to-red-50 border-rose-300 text-rose-900'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    result.type === 'success' ? 'bg-[#2e8b57] text-white shadow-sm' : 'bg-rose-500 text-white shadow-sm'
                  }`}>
                    {result.type === 'success' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] mb-0.5">
                      {result.type === 'success' ? 'Điểm danh thành công' : 'Chưa thể thực hiện'}
                    </h4>
                    <p className="text-[13.5px] leading-relaxed opacity-95">
                      {result.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {result.time && (
                    <span className="bg-[#2e8b57] text-white font-bold text-xs px-2.5 py-1 rounded-md shadow-sm">
                      {result.time}
                    </span>
                  )}
                  <button 
                    onClick={() => setResult(null)} 
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Regular stats */}
        <section className="bg-white rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#eef2f0]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">Thống kê ca chính hôm nay ({todayFormatted})</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              {regular.length} lượt
            </span>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[580px] border-collapse text-[13.5px] text-left">
              <thead>
                <tr>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap w-9">#</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">Giáo viên</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">Check-in</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">Check-out</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">Trễ (phút)</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">Tăng ca (phút)</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {regular.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">Chưa có dữ liệu chấm công hôm nay</td></tr>
                )}
                {regular.map((r, i) => {
                  const isMe = r.user_id === user?.id;
                  const noteText = r.check_out_note || (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '—');
                  return (
                    <tr key={r.id} className={`${isMe ? 'bg-green-50 font-semibold' : ''} hover:bg-slate-50`}>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">{i + 1}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">
                        <strong>{getTitle(r.user?.gender)} {r.user?.full_name?.split(' ').pop()}{isMe ? ' (Bạn)' : ''}</strong>
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">{fmtTime(r.check_in_time)}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">{fmtTime(r.check_out_time)}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">
                        {r.late_minutes > 0 ? <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded-md">{r.late_minutes}</span> : '0'}
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">
                        {r.overtime_minutes > 0 ? <span className="text-blue-600 font-bold bg-blue-100 px-1.5 py-0.5 rounded-md">+{r.overtime_minutes}</span> : '0'}
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">
                        <span className={r.check_out_note?.includes('Không đủ') || r.late_minutes > 0 ? 'text-amber-700' : 'text-gray-700'}>
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
          <div className="md:hidden flex flex-col gap-2.5">
            {regular.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">Chưa có ai chấm công ca chính hôm nay</div>
            ) : (
              regular.map((r, idx) => {
                const isMe = r.user_id === user?.id;
                const teacherName = `${getTitle(r.user?.gender)} ${r.user?.full_name?.split(' ').pop() || ''}`;
                const noteText = r.check_out_note || (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '');
                const isWorking = r.check_in_time && !r.check_out_time;

                return (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-emerald-50/70 border-emerald-200/90 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-white border-gray-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className={`text-sm font-bold ${isMe ? 'text-emerald-950 font-black' : 'text-gray-800'}`}>
                          {teacherName}
                        </span>
                        {isMe && (
                          <span className="bg-[#2e8b57] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Bạn
                          </span>
                        )}
                      </div>
                      {isWorking ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Đang làm việc
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          Đã ra ca
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Vào ca</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-bold text-sm text-gray-800">{fmtTime(r.check_in_time)}</span>
                          {r.late_minutes > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                              Trễ {r.late_minutes}p
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Ra ca</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-bold text-sm text-gray-800">{fmtTime(r.check_out_time)}</span>
                          {r.overtime_minutes > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">
                              +{r.overtime_minutes}p
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {noteText && (
                      <div className="text-[11.5px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-dashed border-slate-200">
                        <span className="font-semibold text-slate-500">Ghi chú:</span> {noteText}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Section 3: Extra stats */}
        <section className="bg-white rounded-[16px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[#eef2f0]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">Thống kê ca ngoài giờ hôm nay ({todayFormatted})</h2>
            <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
              {extra.length} lượt
            </span>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[520px] border-collapse text-[13.5px] text-left">
              <thead>
                <tr>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 w-9">#</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">Giáo viên</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">Ca ngoài giờ</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">Check-in</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">Check-out</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {extra.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có ca ngoài giờ hôm nay</td></tr>
                )}
                {extra.map((r, i) => {
                  const isMe = r.user_id === user?.id;
                  const shiftLabel = r.shift?.name || (r.shift ? `${r.shift.start_time.slice(0, 5)} - ${r.shift.end_time.slice(0, 5)}` : 'Ngoài giờ');
                  const noteText = r.check_out_note || (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '—');
                  return (
                    <tr key={r.id} className={`${isMe ? 'bg-purple-50 font-semibold' : ''} hover:bg-slate-50`}>
                      <td className="px-3 py-2.5 border-b border-slate-100">{i + 1}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100">
                        <strong>{getTitle(r.user?.gender)} {r.user?.full_name?.split(' ').pop()}{isMe ? ' (Bạn)' : ''}</strong>
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {shiftLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100">{fmtTime(r.check_in_time)}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100">{fmtTime(r.check_out_time)}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100">
                        <span className={r.check_out_note?.includes('Không đủ') || r.late_minutes > 0 ? 'text-amber-700' : 'text-gray-700'}>
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
          <div className="md:hidden flex flex-col gap-2.5">
            {extra.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">Chưa có ca ngoài giờ hôm nay</div>
            ) : (
              extra.map((r, idx) => {
                const isMe = r.user_id === user?.id;
                const teacherName = `${getTitle(r.user?.gender)} ${r.user?.full_name?.split(' ').pop() || ''}`;
                const shiftLabel = r.shift?.name || (r.shift ? `${r.shift.start_time.slice(0, 5)} - ${r.shift.end_time.slice(0, 5)}` : 'Ngoài giờ');
                const noteText = r.check_out_note || (r.late_minutes > 0 ? `Trễ ${r.late_minutes} phút` : r.check_in_note || '');
                const isWorking = r.check_in_time && !r.check_out_time;

                return (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-purple-50/70 border-purple-200/90 shadow-xs ring-1 ring-purple-500/20'
                        : 'bg-white border-gray-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className={`text-sm font-bold ${isMe ? 'text-purple-950 font-black' : 'text-gray-800'}`}>
                          {teacherName}
                        </span>
                        {isMe && (
                          <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                            Bạn
                          </span>
                        )}
                      </div>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {shiftLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Vào ca</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-bold text-sm text-gray-800">{fmtTime(r.check_in_time)}</span>
                          {r.late_minutes > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                              Trễ {r.late_minutes}p
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Ra ca</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-bold text-sm text-gray-800">{fmtTime(r.check_out_time)}</span>
                          {isWorking && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded animate-pulse">
                              Đang làm
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {noteText && (
                      <div className="text-[11.5px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-dashed border-slate-200">
                        <span className="font-semibold text-slate-500">Ghi chú:</span> {noteText}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Section 4: Bảng tổng kết công tháng của cô */}
        <section className="bg-white rounded-[14px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#eef2f0]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-[#2e8b57]" />
              <h2 className="text-[15px] font-bold text-gray-800">
                Tổng kết công Tháng {currentMonthStr.split('-')[1]}/{currentMonthStr.split('-')[0]} của {greeting.replace('Chào ', '') || 'Cô'}
              </h2>
            </div>
            <button
              onClick={() => setShowMonthHistory(!showMonthHistory)}
              className="text-xs font-bold text-[#2e8b57] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>{showMonthHistory ? 'Thu gọn' : 'Xem lịch sử tháng'}</span>
              {showMonthHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Ngày công chuẩn</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700">{validMonthDays}</span>
                <span className="text-xs text-emerald-600 font-semibold">buổi/ngày</span>
              </div>
              <span className="text-[11px] text-emerald-600/90 mt-1">Đủ chuẩn &gt; 30 phút</span>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">Tăng ca ca chính</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-700">{totalMonthOTMinutes}</span>
                <span className="text-xs text-indigo-600 font-semibold">phút</span>
              </div>
              <span className="text-[11px] text-indigo-700 font-bold mt-1">
                ≈ {new Intl.NumberFormat('vi-VN').format(totalMonthOTAmount)}đ
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Số phút đi trễ</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-700">{totalMonthLateMinutes}</span>
                <span className="text-xs text-amber-600 font-semibold">phút</span>
              </div>
              <span className="text-[11px] text-amber-700/90 mt-1">Ân hạn 1 phút đầu ca</span>
            </div>
          </div>

          {/* Collapsible history table */}
          {showMonthHistory && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 animate-in fade-in duration-200">
              <h4 className="text-xs font-bold text-gray-700 mb-2">Chi tiết các ngày đã chấm công trong tháng:</h4>
              <div className="w-full overflow-x-auto max-h-60 overflow-y-auto rounded-lg border border-slate-100">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="px-3 py-2">Ngày</th>
                      <th className="px-3 py-2">Ca làm việc</th>
                      <th className="px-3 py-2">Check-in</th>
                      <th className="px-3 py-2">Check-out</th>
                      <th className="px-3 py-2">Trễ</th>
                      <th className="px-3 py-2">Tăng ca</th>
                      <th className="px-3 py-2">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-gray-400">
                          Chưa có dữ liệu chấm công tháng này
                        </td>
                      </tr>
                    ) : (
                      monthRecords.map(r => {
                        const noteText = r.check_out_note || (r.late_minutes > 0 ? `Trễ ${r.late_minutes}p` : r.check_in_note || '—');
                        return (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-800">{formatDate(r.attendance_date)}</td>
                            <td className="px-3 py-2 font-medium text-slate-700">{r.shift?.name || '—'}</td>
                            <td className="px-3 py-2 text-slate-600">{formatTime(r.check_in_time)}</td>
                            <td className="px-3 py-2 text-slate-600">{formatTime(r.check_out_time)}</td>
                            <td className="px-3 py-2 text-amber-700 font-semibold">
                              {r.late_minutes > 0 ? `${r.late_minutes}p` : '0'}
                            </td>
                            <td className="px-3 py-2 text-indigo-700 font-semibold">
                              {r.overtime_minutes > 0 ? `+${r.overtime_minutes}p` : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                                  noteText.includes('Không đủ')
                                    ? 'bg-rose-100 text-rose-800 font-bold'
                                    : noteText.includes('Đủ giờ')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {noteText}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Section 5: Guide */}
        <section className="bg-white rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#eef2f0] overflow-hidden">
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full px-5 py-4 font-bold text-[15px] text-[#2e8b57] cursor-pointer flex items-center justify-between bg-transparent border-none"
          >
            <span>Hướng dẫn sử dụng</span>
            <span className={`text-gray-400 text-xs transition-transform ${guideOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {guideOpen && (
            <div className="px-5 pb-5 border-t border-dashed border-gray-200 pt-3.5">
              {[
                { n: '1', title: 'Kết nối WiFi trường:', desc: 'Đảm bảo thiết bị đã kết nối vào mạng WiFi nội bộ của cơ sở Lumi Preschool.' },
                { n: '2', title: 'Chọn ca & Check-in:', desc: 'Lựa chọn ca làm việc, sau đó nhấn nút Check-in khi vừa đến lớp.' },
                { n: '3', title: 'Cuối ca & Check-out:', desc: 'Sau khi hoàn tất bàn giao, bấm Check-out để hệ thống ghi nhận.' },
              ].map(s => (
                <div key={s.n} className="flex items-start gap-3 mb-3 text-sm text-gray-600">
                  <span className="w-6 h-6 bg-[#e8f5e9] text-[#2e8b57] rounded-full flex items-center justify-center text-xs font-bold shrink-0">{s.n}</span>
                  <div><strong>{s.title}</strong> {s.desc}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 px-4 bg-white border-t border-[#eef2f0] flex flex-col gap-2.5 text-xs text-gray-500">
        <div className="font-bold text-gray-800 text-sm">
          LUMI Preschool — Mầm Non Khai Minh
        </div>
        <div className="text-xs font-semibold text-[#2e8b57]">
          LUMI Preschool - Mầm Non Trải Nghiệm STEAM &amp; Tiếng Anh
        </div>
        <div className="text-gray-500 font-medium">
          T16-33, Vinhomes Grand Park, TP. Thủ Đức
        </div>

        {/* Policy & Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[12px] font-semibold text-emerald-800/90 pt-2 pb-1 border-t border-gray-100">
          <button
            onClick={() => setPolicyModal('privacy')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            🛡️ Chính sách bảo mật
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('attendance')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            📋 Quy chế chấm công
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('cookie')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            🍪 Chính sách Cookie
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('support')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            📞 Báo sự cố / Hỗ trợ
          </button>
        </div>

        <div className="text-slate-600 text-sm mt-1 pt-2.5 border-t border-gray-100">
          Thiết kế &amp; Phát triển hệ thống bởi:{' '}
          <a
            href="mailto:vietthanhnguyen.tsen@gmail.com"
            className="text-[#2e8b57] font-bold hover:underline"
          >
            Nguyễn Việt Thành (vietthanhnguyen.tsen@gmail.com)
          </a>
        </div>
        <div className="text-[11px] text-gray-400">© 2026 LUMI Preschool. All rights reserved.</div>
      </footer>

      {/* Policy Modals */}
      <PolicyModals activePolicy={policyModal} onClose={() => setPolicyModal(null)} />
    </div>
  );
}
