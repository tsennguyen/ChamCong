'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import {
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  LogIn,
  LogOut,
  CheckCircle,
  Sparkles,
  XCircle,
  Plus,
  Wifi,
  WifiOff,
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

type Lang = 'vi' | 'en';

const translations = {
  vi: {
    schoolName: 'LUMI Preschool',
    schoolSubtitle: 'Mầm Non Khai Minh',
    slogan: 'LUMI Preschool - Mầm Non Trải Nghiệm STEAM & Tiếng Anh',
    address: 'T16-33, Vinhomes Grand Park, TP. Thủ Đức',
    teacher: 'Giáo viên',
    logout: 'Thoát',
    teacherAttendance: 'Điểm danh',
    statusCompleted: 'Đã hoàn thành',
    statusNotEnough: 'Không đủ giờ làm',
    statusWorking: 'Đang làm việc',
    statusNotStarted: 'Chưa vào ca',
    currentShiftPrefix: 'Ca:',
    selectShiftLabel: 'Ca làm việc',
    selectShiftHint: '',
    noShiftAssigned: 'Chưa có ca nào được phân công',
    clockInAt: 'Vào ca:',
    clockOutAt: 'Ra về:',
    late: 'Trễ',
    mins: 'phút',
    overtime: 'Tăng ca',
    mainShift: 'Ca chính',
    extraShift: 'Ngoài giờ',
    wifiConnected: 'WiFi trường:',
    wifiReady: 'Sẵn sàng điểm danh!',
    wifiBlocked: 'Vui lòng kết nối WiFi trường:',
    wifiInvalid: 'Mạng hiện tại không hợp lệ.',
    wifiChecking: 'Đang kiểm tra WiFi trường học...',
    addNote: '+ Ghi chú',
    notePlaceholder: 'Ghi chú (nếu có)...',
    btnCheckin: 'Check-in',
    btnCheckout: 'Check-out',
    inShiftMsg: '',
    shiftCompleteSuccess: 'Đã hoàn tất ca làm việc!',
    shiftCompleteNotEnough: 'Ca làm việc không đủ giờ quy định (< 30 phút)',
    notEnoughWarning: 'Ca này không đủ thời gian tối thiểu 30 phút và không được tính công (0 công).',
    successTitle: 'Điểm danh thành công',
    errorTitle: 'Chưa thể thực hiện',
    todayRegularTitle: 'Thống kê ca chính hôm nay',
    todayExtraTitle: 'Thống kê ca ngoài giờ hôm nay',
    turns: 'lượt',
    noDataToday: 'Chưa có dữ liệu chấm công hôm nay',
    noExtraToday: 'Chưa có ca ngoài giờ hôm nay',
    teacherCol: 'Giáo viên',
    checkinCol: 'Check-in',
    checkoutCol: 'Check-out',
    lateCol: 'Trễ (phút)',
    otCol: 'Tăng ca (phút)',
    noteCol: 'Ghi chú',
    extraShiftCol: 'Ca ngoài giờ',
    youBadge: 'Bạn',
    workingBadge: 'Đang làm việc',
    endedBadge: 'Đã ra ca',
    note: 'Ghi chú',
    monthSummaryTitle: 'Tổng kết công Tháng',
    ofTeacher: 'của',
    collapse: 'Thu gọn',
    viewHistory: 'Xem lịch sử tháng',
    standardDays: 'Ngày công chuẩn',
    daysUnit: 'buổi/ngày',
    standardDaysHint: 'Đủ chuẩn > 30 phút',
    otMinutes: 'Tăng ca ca chính',
    otMinutesUnit: 'phút',
    lateMinutes: 'Số phút đi trễ',
    gracePeriodHint: 'Ân hạn 1 phút đầu ca',
    historyTitle: 'Chi tiết các ngày đã chấm công trong tháng:',
    dateCol: 'Ngày',
    shiftCol: 'Ca làm việc',
    statusCol: 'Tình trạng',
    noMonthData: 'Chưa có dữ liệu chấm công tháng này',
    guideTitle: 'Hướng dẫn sử dụng',
    step1Title: '1. Kết nối WiFi trường:',
    step1Desc: 'Đảm bảo thiết bị đã kết nối vào mạng WiFi nội bộ của cơ sở Lumi Preschool.',
    step2Title: '2. Chọn ca & Check-in:',
    step2Desc: 'Lựa chọn ca làm việc, sau đó nhấn nút Check-in khi vừa đến lớp.',
    step3Title: '3. Cuối ca & Check-out:',
    step3Desc: 'Sau khi hoàn tất bàn giao, bấm Check-out để hệ thống ghi nhận.',
    policyPrivacy: 'Chính sách bảo mật',
    policyAttendance: 'Quy định chấm công',
    policyCookie: 'Chính sách Cookie',
    policySupport: 'Báo sự cố & Hỗ trợ',
    creditDev: 'Thiết kế & Phát triển hệ thống bởi:',
    copyright: '© 2026 LUMI Preschool. All rights reserved.',
  },
  en: {
    schoolName: 'LUMI Preschool',
    schoolSubtitle: 'Khai Minh Kindergarten',
    slogan: 'LUMI Preschool - STEAM & English Experiential Kindergarten',
    address: 'T16-33, Vinhomes Grand Park, Thu Duc City',
    teacher: 'Teacher',
    logout: 'Log out',
    teacherAttendance: 'Attendance',
    statusCompleted: 'Completed',
    statusNotEnough: 'Not Enough Hours',
    statusWorking: 'On Duty',
    statusNotStarted: 'Not Clocked In',
    currentShiftPrefix: 'Shift:',
    selectShiftLabel: 'Shift',
    selectShiftHint: '',
    noShiftAssigned: 'No shifts assigned',
    clockInAt: 'Clock-in:',
    clockOutAt: 'Clock-out:',
    late: 'Late',
    mins: 'mins',
    overtime: 'Overtime',
    mainShift: 'Main Shift',
    extraShift: 'Overtime',
    wifiConnected: 'School WiFi:',
    wifiReady: 'Ready to clock in!',
    wifiBlocked: 'Please connect to school WiFi:',
    wifiInvalid: 'Current network is not permitted.',
    wifiChecking: 'Checking school WiFi connection...',
    addNote: '+ Note',
    notePlaceholder: 'Optional note...',
    btnCheckin: 'Check-in',
    btnCheckout: 'Check-out',
    inShiftMsg: '',
    shiftCompleteSuccess: 'Shift successfully completed!',
    shiftCompleteNotEnough: 'Shift duration below required standard (< 30 mins)',
    notEnoughWarning: 'This shift did not meet the 30-minute minimum requirement and will not be counted (0 attendance).',
    successTitle: 'Attendance recorded successfully',
    errorTitle: 'Action could not be completed',
    todayRegularTitle: "Today's Main Shifts",
    todayExtraTitle: "Today's Overtime Shifts",
    turns: 'entries',
    noDataToday: 'No attendance records today',
    noExtraToday: 'No overtime shifts today',
    teacherCol: 'Teacher',
    checkinCol: 'Check-in',
    checkoutCol: 'Check-out',
    lateCol: 'Late (mins)',
    otCol: 'Overtime (mins)',
    noteCol: 'Note',
    extraShiftCol: 'Overtime Shift',
    youBadge: 'You',
    workingBadge: 'Working',
    endedBadge: 'Off Duty',
    note: 'Note',
    monthSummaryTitle: 'Monthly Summary of',
    ofTeacher: '',
    collapse: 'Collapse',
    viewHistory: 'View Monthly History',
    standardDays: 'Standard Work Days',
    daysUnit: 'days',
    standardDaysHint: 'Valid shifts > 30 mins',
    otMinutes: 'Main Shift Overtime',
    otMinutesUnit: 'mins',
    lateMinutes: 'Late Minutes',
    gracePeriodHint: '1-minute grace period applied',
    historyTitle: 'Attendance records for this month:',
    dateCol: 'Date',
    shiftCol: 'Shift',
    statusCol: 'Status',
    noMonthData: 'No attendance data for this month',
    guideTitle: 'User Guide',
    step1Title: '1. Connect to School WiFi:',
    step1Desc: 'Ensure your device is connected to Lumi Preschool internal WiFi.',
    step2Title: '2. Select Shift & Check-in:',
    step2Desc: 'Choose your assigned shift, then press Check-in upon arriving.',
    step3Title: '3. End of Shift & Check-out:',
    step3Desc: 'After classroom handover, press Check-out to record your departure.',
    policyPrivacy: 'Privacy Policy',
    policyAttendance: 'Attendance Policy',
    policyCookie: 'Cookie Policy',
    policySupport: 'Incident Report & Support',
    creditDev: 'System Designed & Developed by:',
    copyright: '© 2026 LUMI Preschool. All rights reserved.',
  }
};

export default function TeacherPage() {
  const { user } = useAuth();
  const { isOnWifi: wifiOk, message: wifiMsg } = useWifiCheck();
  const fingerprint = useDeviceFingerprint();

  const [lang, setLang] = useState<Lang>('vi');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [userNote, setUserNote] = useState('');
  const [showNote, setShowNote] = useState(false);
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

  // Load language preference
  useEffect(() => {
    const saved = localStorage.getItem('lumi_lang') as Lang;
    if (saved && (saved === 'vi' || saved === 'en')) {
      setLang(saved);
    }
  }, []);

  const t = translations[lang];

  const todayString = getTodayString();
  const currentMonthStr = getCurrentMonthString();
  const todayFormatted = formatDate(new Date());

  const greeting = useMemo(() => {
    if (!user) return '';
    if (lang === 'en') {
      const name = user.name?.split(' ').pop() || '';
      return `Hello Teacher ${name}`;
    }
    return getGreeting(user.gender as 'male' | 'female', user.name || '');
  }, [user, lang]);

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
  const isNotEnoughTime = isCheckedOut && (
    myRecord?.check_out_note?.includes('Không đủ') ||
    myRecord?.check_out_note?.includes('not enough') ||
    myRecord?.status === 'insufficient'
  );
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
    } catch { setResult({ type: 'error', message: lang === 'en' ? 'Server connection error' : 'Lỗi kết nối máy chủ' }); }
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
    } catch { setResult({ type: 'error', message: lang === 'en' ? 'Server connection error' : 'Lỗi kết nối máy chủ' }); }
    setLoading(false);
  };

  const fmtTime = (tVal: string | null) => formatTime(tVal);
  const getTitle = (g?: string) => {
    if (lang === 'en') return 'Teacher';
    return g === 'male' ? 'Thầy' : 'Cô';
  };

  return (
    <div className="min-h-screen bg-[#f0f7f0] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-b border-[rgba(46,139,87,0.12)]">
        <div className="max-w-[800px] mx-auto px-3.5 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center gap-2">
          {/* Logo only */}
          <div className="flex items-center shrink-0">
            <Image
              src="/logolumi.jpg"
              alt="Logo"
              width={42}
              height={42}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-[0_2px_6px_rgba(46,139,87,0.2)] object-cover shrink-0"
            />
          </div>

          {/* Right Header: Language toggle, Greeting & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Language Selector */}
            <button
              onClick={() => {
                const next = lang === 'vi' ? 'en' : 'vi';
                setLang(next);
                localStorage.setItem('lumi_lang', next);
              }}
              className="flex items-center gap-1 border border-gray-200 px-2 py-1 rounded-full text-[11px] font-bold text-gray-700 hover:border-emerald-500 hover:text-emerald-700 bg-gray-50 transition-all cursor-pointer shrink-0"
              title={lang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              <span>{lang === 'vi' ? '🇻🇳 VIE' : '🇬🇧 ENG'}</span>
            </button>

            {/* Greeting badge - VISIBLE ON MOBILE */}
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold shadow-xs max-w-[130px] sm:max-w-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="truncate">{greeting || t.teacher}</span>
            </div>

            {/* Thoát */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all cursor-pointer"
              title={t.logout}
            >
              <LogOut className="w-3.5 h-3.5 text-gray-500 hover:text-red-500 shrink-0" />
              <span className="font-medium">{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[800px] w-full mx-auto px-3.5 sm:px-4 py-4 flex flex-col gap-4 sm:gap-5 flex-1">
        {/* Section 1: Check-in/out Hero Card */}
        <section className="bg-white rounded-[16px] p-3.5 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.05)] border border-[#eef2f0] border-l-[5px] border-l-[#2e8b57]">
          {/* Header & Status Indicator */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base sm:text-lg font-bold text-[#2e8b57] flex items-center gap-2">
              <span>{t.teacherAttendance}</span>
              {isCheckedOut ? (
                isNotEnoughTime ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                    <AlertCircle className="w-3 h-3 text-rose-600" /> {t.statusNotEnough}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> {t.statusCompleted}
                  </span>
                )
              ) : isCheckedIn ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {t.statusWorking}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  {t.statusNotStarted}
                </span>
              )}
            </h2>

            {/* Quick shift status tag */}
            {isCheckedIn && myRecord && (
              <div className="text-xs text-gray-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                {t.clockInAt} <strong className="text-emerald-700 font-bold">{fmtTime(myRecord.check_in_time)}</strong>
                {myRecord.late_minutes > 0 && (
                  <span className="text-rose-600 font-semibold ml-1">
                    ({t.late} {myRecord.late_minutes}{t.mins})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Realtime Vietnam Clock with WiFi indicator */}
          <RealtimeClock
            lang={lang}
            rightElement={
              network ? (
                network.allowed ? (
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100/90 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                    title={`WiFi: ${network.school_ssid}`}
                  >
                    <Wifi className="w-4 h-4 text-emerald-700" />
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs animate-pulse"
                    title={lang === 'vi' ? 'Chưa đúng WiFi trường' : 'Not on school WiFi'}
                  >
                    <WifiOff className="w-4 h-4 text-rose-600" />
                  </div>
                )
              ) : (
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-400 border border-gray-200"
                  title="Checking WiFi..."
                >
                  <Wifi className="w-4 h-4 text-gray-400 animate-pulse" />
                </div>
              )
            }
          />

          {/* WiFi Blocked Alert (Only if invalid network) */}
          {network && !network.allowed && (
            <div className="flex items-center gap-2 text-xs font-semibold p-2.5 rounded-xl mb-3 bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{t.wifiBlocked} <strong>{network.school_ssid}</strong></span>
            </div>
          )}

          {/* Shift Selection: Just the hours (07:00 - 17:00) */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {t.selectShiftLabel}
            </label>
            <div className="relative">
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                className="w-full h-11 border border-gray-200 rounded-xl px-3 pr-9 text-sm font-semibold text-gray-800 bg-gray-50/50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all appearance-none cursor-pointer"
              >
                {shifts.length === 0 && <option>{t.noShiftAssigned}</option>}
                {shifts.map(s => {
                  const start = s.start_time.slice(0, 5);
                  const end = s.end_time.slice(0, 5);
                  return (
                    <option key={s.id} value={s.id}>
                      {start} - {end}
                    </option>
                  );
                })}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Optional Note (Collapsed by default, only opened on demand) */}
          {!isCheckedOut && (
            <div className="mb-3">
              {showNote || userNote ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={userNote}
                    onChange={e => setUserNote(e.target.value)}
                    placeholder={t.notePlaceholder}
                    className="flex-1 h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400"
                    autoFocus={showNote && !userNote}
                  />
                  {!userNote && (
                    <button
                      type="button"
                      onClick={() => setShowNote(false)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1 py-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => setShowNote(true)}
                    className="text-[11.5px] text-gray-400 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t.addNote}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile-First Big Contextual Action Buttons */}
          <div className="mb-3">
            {!isCheckedIn ? (
              /* Case 1: NOT CHECKED IN YET -> Check-in */
              <button
                onClick={handleCheckin}
                disabled={loading || (network !== null && !network.allowed)}
                className="w-full h-12 bg-[#2e8b57] hover:bg-[#257347] active:scale-[0.99] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-900/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5 shrink-0" />
                )}
                <span>{t.btnCheckin}</span>
              </button>
            ) : !isCheckedOut ? (
              /* Case 2: IN SHIFT -> Check-out */
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-md shadow-rose-900/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogOut className="w-5 h-5 shrink-0" />
                )}
                <span>{t.btnCheckout}</span>
              </button>
            ) : (
              /* Case 3: COMPLETED SHIFT TODAY */
              isNotEnoughTime ? (
                /* 3A: NOT ENOUGH HOURS -> RED WARNING BANNER */
                <div className="bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border border-rose-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-950 text-sm sm:text-base flex items-center gap-1.5">
                        <span>{t.shiftCompleteNotEnough}</span>
                      </h4>
                      <p className="text-xs text-rose-800 mt-0.5">
                        {t.clockInAt} <strong>{fmtTime(myRecord?.check_in_time)}</strong> ➔ {t.clockOutAt} <strong>{fmtTime(myRecord?.check_out_time)}</strong>
                      </p>
                      <p className="text-[11.5px] text-rose-700 mt-1 font-medium">
                        {t.notEnoughWarning}
                      </p>
                    </div>
                  </div>
                  {myRecord?.check_out_note && (
                    <span className="text-[11.5px] font-bold text-rose-900 bg-white border border-rose-200 px-3 py-1.5 rounded-lg self-start sm:self-auto shadow-xs">
                      {myRecord.check_out_note}
                    </span>
                  )}
                </div>
              ) : (
                /* 3B: FULL / VALID SHIFT -> GREEN CELEBRATION BANNER */
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-950 text-sm sm:text-base flex items-center gap-1.5">
                        <span>{t.shiftCompleteSuccess}</span>
                        <Sparkles className="w-4 h-4 text-amber-500" />
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        {t.clockInAt} <strong>{fmtTime(myRecord?.check_in_time)}</strong> ➔ {t.clockOutAt} <strong>{fmtTime(myRecord?.check_out_time)}</strong>
                        {myRecord?.overtime_minutes ? ` • ${t.overtime}: +${myRecord.overtime_minutes}${t.mins}` : ''}
                      </p>
                    </div>
                  </div>
                  {myRecord?.check_out_note && (
                    <span className="text-[11.5px] font-semibold text-emerald-900 bg-white/80 border border-emerald-200 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                      {myRecord.check_out_note}
                    </span>
                  )}
                </div>
              )
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
                      {result.type === 'success' ? t.successTitle : t.errorTitle}
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
            <h2 className="text-base font-bold text-gray-800">{t.todayRegularTitle} ({todayFormatted})</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              {regular.length} {t.turns}
            </span>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[580px] border-collapse text-[13.5px] text-left">
              <thead>
                <tr>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap w-9">#</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">{t.teacherCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">{t.checkinCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">{t.checkoutCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">{t.lateCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">{t.otCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 whitespace-nowrap">{t.noteCol}</th>
                </tr>
              </thead>
              <tbody>
                {regular.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">{t.noDataToday}</td></tr>
                )}
                {regular.map((r, i) => {
                  const isMe = r.user_id === user?.id;
                  const isNotEnough = r.check_out_note?.includes('Không đủ') || r.check_out_note?.includes('not enough');
                  const noteText = r.check_out_note || (r.late_minutes > 0 ? `${t.late} ${r.late_minutes} ${t.mins}` : r.check_in_note || '—');
                  return (
                    <tr key={r.id} className={`${isMe ? (isNotEnough ? 'bg-rose-50 font-semibold' : 'bg-green-50 font-semibold') : (isNotEnough ? 'bg-rose-50/40' : '')} hover:bg-slate-50`}>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">{i + 1}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100 whitespace-nowrap">
                        <strong>{getTitle(r.user?.gender)} {r.user?.full_name?.split(' ').pop()}{isMe ? ` (${t.youBadge})` : ''}</strong>
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
                        {isNotEnough ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {noteText}
                          </span>
                        ) : (
                          <span className={r.late_minutes > 0 ? 'text-amber-700' : 'text-gray-700'}>
                            {noteText}
                          </span>
                        )}
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
              <div className="text-center py-6 text-gray-400 text-xs">{t.noDataToday}</div>
            ) : (
              regular.map((r, idx) => {
                const isMe = r.user_id === user?.id;
                const teacherName = `${getTitle(r.user?.gender)} ${r.user?.full_name?.split(' ').pop() || ''}`;
                const isNotEnough = r.check_out_note?.includes('Không đủ') || r.check_out_note?.includes('not enough');
                const noteText = r.check_out_note || (r.late_minutes > 0 ? `${t.late} ${r.late_minutes} ${t.mins}` : r.check_in_note || '');
                const isWorking = r.check_in_time && !r.check_out_time;

                return (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isNotEnough
                        ? 'bg-rose-50/80 border-rose-200 shadow-xs ring-1 ring-rose-500/20'
                        : isMe
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
                            {t.youBadge}
                          </span>
                        )}
                      </div>
                      {isWorking ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {t.workingBadge}
                        </span>
                      ) : isNotEnough ? (
                        <span className="text-[11px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                          {t.statusNotEnough}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {t.endedBadge}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t.checkinCol}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-bold text-sm text-gray-800">{fmtTime(r.check_in_time)}</span>
                          {r.late_minutes > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                              {t.late} {r.late_minutes}p
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t.checkoutCol}</span>
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
                      <div className={`text-[11.5px] px-2.5 py-1.5 rounded-lg border ${
                        isNotEnough
                          ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                          : 'text-slate-600 bg-white border-dashed border-slate-200'
                      }`}>
                        <span className="font-semibold text-slate-500">{t.note}:</span> {noteText}
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
            <h2 className="text-base font-bold text-gray-800">{t.todayExtraTitle} ({todayFormatted})</h2>
            <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
              {extra.length} {t.turns}
            </span>
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[520px] border-collapse text-[13.5px] text-left">
              <thead>
                <tr>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200 w-9">#</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">{t.teacherCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">{t.extraShiftCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">{t.checkinCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">{t.checkoutCol}</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-3 py-2.5 border-b-[1.5px] border-slate-200">{t.noteCol}</th>
                </tr>
              </thead>
              <tbody>
                {extra.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">{t.noExtraToday}</td></tr>
                )}
                {extra.map((r, i) => {
                  const isMe = r.user_id === user?.id;
                  const isNotEnough = r.check_out_note?.includes('Không đủ') || r.check_out_note?.includes('not enough');
                  const shiftLabel = r.shift?.name || (r.shift ? `${r.shift.start_time.slice(0, 5)} - ${r.shift.end_time.slice(0, 5)}` : t.extraShift);
                  const noteText = r.check_out_note || (r.late_minutes > 0 ? `${t.late} ${r.late_minutes} ${t.mins}` : r.check_in_note || '—');
                  return (
                    <tr key={r.id} className={`${isMe ? (isNotEnough ? 'bg-rose-50 font-semibold' : 'bg-purple-50 font-semibold') : (isNotEnough ? 'bg-rose-50/40' : '')} hover:bg-slate-50`}>
                      <td className="px-3 py-2.5 border-b border-slate-100">{i + 1}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100">
                        <strong>{getTitle(r.user?.gender)} {r.user?.full_name?.split(' ').pop()}{isMe ? ` (${t.youBadge})` : ''}</strong>
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                          {shiftLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 border-b border-slate-100">{fmtTime(r.check_in_time)}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100">{fmtTime(r.check_out_time)}</td>
                      <td className="px-3 py-2.5 border-b border-slate-100">
                        {isNotEnough ? (
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {noteText}
                          </span>
                        ) : (
                          <span className={r.late_minutes > 0 ? 'text-amber-700' : 'text-gray-700'}>
                            {noteText}
                          </span>
                        )}
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
              <div className="text-center py-6 text-gray-400 text-xs">{t.noExtraToday}</div>
            ) : (
              extra.map((r, idx) => {
                const isMe = r.user_id === user?.id;
                const teacherName = `${getTitle(r.user?.gender)} ${r.user?.full_name?.split(' ').pop() || ''}`;
                const isNotEnough = r.check_out_note?.includes('Không đủ') || r.check_out_note?.includes('not enough');
                const shiftLabel = r.shift?.name || (r.shift ? `${r.shift.start_time.slice(0, 5)} - ${r.shift.end_time.slice(0, 5)}` : t.extraShift);
                const noteText = r.check_out_note || (r.late_minutes > 0 ? `${t.late} ${r.late_minutes} ${t.mins}` : r.check_in_note || '');
                const isWorking = r.check_in_time && !r.check_out_time;

                return (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isNotEnough
                        ? 'bg-rose-50/80 border-rose-200 shadow-xs ring-1 ring-rose-500/20'
                        : isMe
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
                            {t.youBadge}
                          </span>
                        )}
                      </div>
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {shiftLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t.checkinCol}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-bold text-sm text-gray-800">{fmtTime(r.check_in_time)}</span>
                          {r.late_minutes > 0 && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                              {t.late} {r.late_minutes}p
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t.checkoutCol}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="font-bold text-sm text-gray-800">{fmtTime(r.check_out_time)}</span>
                          {isWorking && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded animate-pulse">
                              {t.workingBadge}
                            </span>
                          )}
                          {isNotEnough && (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
                              {t.statusNotEnough}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {noteText && (
                      <div className={`text-[11.5px] px-2.5 py-1.5 rounded-lg border ${
                        isNotEnough
                          ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                          : 'text-slate-600 bg-white border-dashed border-slate-200'
                      }`}>
                        <span className="font-semibold text-slate-500">{t.note}:</span> {noteText}
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
                {t.monthSummaryTitle} {currentMonthStr.split('-')[1]}/{currentMonthStr.split('-')[0]} {t.ofTeacher} {greeting.replace('Chào ', '').replace('Hello ', '') || t.teacher}
              </h2>
            </div>
            <button
              onClick={() => setShowMonthHistory(!showMonthHistory)}
              className="text-xs font-bold text-[#2e8b57] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>{showMonthHistory ? t.collapse : t.viewHistory}</span>
              {showMonthHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">{t.standardDays}</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700">{validMonthDays}</span>
                <span className="text-xs text-emerald-600 font-semibold">{t.daysUnit}</span>
              </div>
              <span className="text-[11px] text-emerald-600/90 mt-1">{t.standardDaysHint}</span>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wide">{t.otMinutes}</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-700">{totalMonthOTMinutes}</span>
                <span className="text-xs text-indigo-600 font-semibold">{t.otMinutesUnit}</span>
              </div>
              <span className="text-[11px] text-indigo-700 font-bold mt-1">
                ≈ {new Intl.NumberFormat('vi-VN').format(totalMonthOTAmount)}đ
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">{t.lateMinutes}</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-700">{totalMonthLateMinutes}</span>
                <span className="text-xs text-amber-600 font-semibold">{t.otMinutesUnit}</span>
              </div>
              <span className="text-[11px] text-amber-700/90 mt-1">{t.gracePeriodHint}</span>
            </div>
          </div>

          {/* Collapsible history table */}
          {showMonthHistory && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 animate-in fade-in duration-200">
              <h4 className="text-xs font-bold text-gray-700 mb-2">{t.historyTitle}</h4>
              <div className="w-full overflow-x-auto max-h-60 overflow-y-auto rounded-lg border border-slate-100">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="px-3 py-2">{t.dateCol}</th>
                      <th className="px-3 py-2">{t.shiftCol}</th>
                      <th className="px-3 py-2">{t.checkinCol}</th>
                      <th className="px-3 py-2">{t.checkoutCol}</th>
                      <th className="px-3 py-2">{t.late}</th>
                      <th className="px-3 py-2">{t.overtime}</th>
                      <th className="px-3 py-2">{t.statusCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-gray-400">
                          {t.noMonthData}
                        </td>
                      </tr>
                    ) : (
                      monthRecords.map(r => {
                        const isNotEnough = r.check_out_note?.includes('Không đủ') || r.check_out_note?.includes('not enough');
                        const noteText = r.check_out_note || (r.late_minutes > 0 ? `${t.late} ${r.late_minutes}p` : r.check_in_note || '—');
                        return (
                          <tr key={r.id} className={`hover:bg-slate-50 ${isNotEnough ? 'bg-rose-50/50' : ''}`}>
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
                                  isNotEnough
                                    ? 'bg-rose-100 text-rose-800 font-bold border border-rose-200'
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
            <span>{t.guideTitle}</span>
            <span className={`text-gray-400 text-xs transition-transform ${guideOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {guideOpen && (
            <div className="px-5 pb-5 border-t border-dashed border-gray-200 pt-3.5">
              {[
                { n: '1', title: t.step1Title, desc: t.step1Desc },
                { n: '2', title: t.step2Title, desc: t.step2Desc },
                { n: '3', title: t.step3Title, desc: t.step3Desc },
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
          {t.schoolName} — {t.schoolSubtitle}
        </div>
        <div className="text-xs font-semibold text-[#2e8b57]">
          {t.slogan}
        </div>
        <div className="text-gray-500 font-medium">
          {t.address}
        </div>

        {/* Policy & Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[12px] font-semibold text-emerald-800/90 pt-2 pb-1 border-t border-gray-100">
          <button
            onClick={() => setPolicyModal('privacy')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            {t.policyPrivacy}
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('attendance')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            {t.policyAttendance}
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('cookie')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            {t.policyCookie}
          </button>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <button
            onClick={() => setPolicyModal('support')}
            className="hover:text-emerald-950 hover:underline transition-colors cursor-pointer"
          >
            {t.policySupport}
          </button>
        </div>

        <div className="text-slate-600 text-xs mt-1 pt-2.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 leading-normal">
          <span>{t.creditDev}</span>
          <a
            href="mailto:vietthanhnguyen.tsen@gmail.com"
            className="text-[#2e8b57] font-bold hover:underline inline-block whitespace-nowrap"
          >
            Nguyễn Việt Thành (vietthanhnguyen.tsen@gmail.com)
          </a>
        </div>
        <div className="text-[11px] text-gray-400">{t.copyright}</div>
      </footer>

      {/* Policy Modals */}
      <PolicyModals activePolicy={policyModal} onClose={() => setPolicyModal(null)} lang={lang} />
    </div>
  );
}
