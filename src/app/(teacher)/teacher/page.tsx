'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'next-auth/react';
import { useWifiCheck } from '@/hooks/useWifiCheck';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { getGreeting } from '@/lib/greeting';
import { getTodayString, formatDate, formatTime } from '@/lib/utils';
import Image from 'next/image';

interface Shift { id: string; name: string; type: string; start_time: string; end_time: string; }
interface TodayRecord {
  id: string; user_id: string; shift_id: string; attendance_date: string;
  check_in_time: string | null; check_out_time: string | null;
  late_minutes: number; overtime_minutes: number; status: string;
  check_in_note: string | null; shift_type: string;
  user?: { id: string; full_name: string; gender: string };
  shift?: { id: string; name: string; type: string; start_time: string; end_time: string };
}
interface ExtraRecord {
  id: string; user_id: string; session_date: string;
  planned_start: string; planned_end: string;
  actual_check_in: string | null; actual_check_out: string | null;
  note: string | null;
  user?: { id: string; full_name: string; gender: string };
}

export default function TeacherPage() {
  const { user } = useAuth();
  const { isOnWifi: wifiOk, message: wifiMsg } = useWifiCheck();
  const fingerprint = useDeviceFingerprint();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [regular, setRegular] = useState<TodayRecord[]>([]);
  const [extra, setExtra] = useState<ExtraRecord[]>([]);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string; time?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [network, setNetwork] = useState<{ allowed: boolean; client_ip: string; school_ssid: string } | null>(null);

  const todayString = getTodayString();
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

  useEffect(() => { fetchToday(); const iv = setInterval(fetchToday, 15000); return () => clearInterval(iv); }, [fetchToday]);

  const myRecord = regular.find(r => r.user_id === user?.id && r.shift_id === selectedShift);
  const isCheckedIn = !!myRecord;
  const isCheckedOut = isCheckedIn && myRecord.status === 'checked_out';

  const handleCheckin = async () => {
    if (!selectedShift) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: selectedShift, device_fingerprint: fingerprint }),
      });
      const data = await res.json();
      if (res.ok) {
        const time = data.data?.attendance?.check_in_time ? formatTime(data.data.attendance.check_in_time) : '';
        setResult({ type: 'success', message: data.message, time });
        fetchToday();
        setTimeout(fetchToday, 800);
      } else {
        setResult({ type: 'error', message: data.error });
      }
    } catch { setResult({ type: 'error', message: 'Lỗi kết nối' }); }
    setLoading(false);
  };

  const handleCheckout = async () => {
    if (!myRecord) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: myRecord.id, device_fingerprint: fingerprint }),
      });
      const data = await res.json();
      if (res.ok) {
        const time = data.data?.attendance?.check_out_time ? formatTime(data.data.attendance.check_out_time) : '';
        setResult({ type: 'success', message: data.message, time });
        fetchToday();
        setTimeout(fetchToday, 800);
      } else {
        setResult({ type: 'error', message: data.error });
      }
    } catch { setResult({ type: 'error', message: 'Lỗi kết nối' }); }
    setLoading(false);
  };

  const fmtTime = (t: string | null) => formatTime(t);
  const getTitle = (g?: string) => g === 'male' ? 'Thầy' : 'Cô';

  return (
    <div className="min-h-screen bg-[#f0f7f0] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.05)] border-b border-[rgba(46,139,87,0.12)]">
        <div className="max-w-[800px] mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Image src="/logolumi.jpg" alt="Logo" width={40} height={40} className="rounded-full shadow-[0_2px_6px_rgba(46,139,87,0.2)]" />
            <span className="text-lg font-bold text-[#2e8b57] tracking-tight">Lumi Preschool</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 hidden sm:inline">{greeting}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1 border border-gray-200 px-2.5 py-1.5 rounded-lg text-[13px] text-gray-600 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-[800px] w-full mx-auto px-4 py-4 flex flex-col gap-5 flex-1">
        {/* Section 1: Check-in/out */}
        <section className="bg-white rounded-[14px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#eef2f0] border-l-[5px] border-l-[#2e8b57]">
          <h2 className="text-base font-bold text-[#2e8b57] mb-4">Điểm danh</h2>

          <div className="mb-3.5">
            <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">Chọn ca làm việc</label>
            <select
              value={selectedShift}
              onChange={e => setSelectedShift(e.target.value)}
              className="w-full h-11 border-[1.5px] border-gray-300 rounded-lg px-3.5 text-[15px] text-gray-900 bg-gray-50 outline-none"
            >
              {shifts.length === 0 && <option>Chưa có ca nào</option>}
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>)}
            </select>
          </div>

          {/* WiFi status */}
          {network ? (
            <div className={`flex items-center gap-2.5 text-[13px] font-medium px-3.5 py-2.5 rounded-lg mb-4 ${network.allowed ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${network.allowed ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
              <div className="flex-1">
                {network.allowed ? (
                  <span>Đã kết nối đúng mạng trường học <strong>({network.school_ssid})</strong></span>
                ) : (
                  <span>
                    <strong>Không thể chấm công:</strong> Vui lòng kết nối vào mạng WiFi trường <strong>({network.school_ssid})</strong>. Mạng hiện tại (IP: {network.client_ip}) không được phép.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[13px] font-medium px-3 py-2 rounded-lg mb-4 bg-gray-50 text-gray-600 border border-gray-200">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
              <span>Đang kiểm tra kết nối mạng trường...</span>
            </div>
          )}

          {/* Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleCheckin}
              disabled={loading || isCheckedIn || (network !== null && !network.allowed)}
              className="h-12 bg-[#2e8b57] hover:brightness-[0.92] active:scale-[0.99] text-white rounded-[10px] text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check-in
            </button>
            <button
              onClick={handleCheckout}
              disabled={loading || !isCheckedIn || isCheckedOut}
              className="h-12 bg-red-600 hover:brightness-[0.92] active:scale-[0.99] text-white rounded-[10px] text-[15px] font-bold flex items-center justify-center gap-2 shadow-[0_4px_10px_rgba(0,0,0,0.1)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check-out
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg px-3.5 py-3 text-sm flex items-center justify-between flex-wrap gap-2 ${result.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              <div className="flex items-center gap-2">
                <span>{result.message}</span>
              </div>
              {result.time && <span className="bg-[#2e8b57] text-white font-bold text-[13px] px-2.5 py-0.5 rounded-full">{result.time}</span>}
            </div>
          )}
        </section>

        {/* Section 2: Regular stats */}
        <section className="bg-white rounded-[14px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#eef2f0]">
          <h2 className="text-base font-bold text-gray-800 mb-3">Thống kê ca chính hôm nay ({todayFormatted})</h2>
          <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
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
                        {r.late_minutes > 0 ? <span className="text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded-md">Trễ {r.late_minutes} phút</span> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Extra stats */}
        <section className="bg-white rounded-[14px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.04)] border border-[#eef2f0]">
          <h2 className="text-base font-bold text-gray-800 mb-3">Thống kê ca ngoài giờ hôm nay ({todayFormatted})</h2>
          <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[480px] border-collapse text-[13.5px] text-left">
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
                {extra.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 border-b border-slate-100">{i + 1}</td>
                    <td className="px-3 py-2.5 border-b border-slate-100">{getTitle(r.user?.gender)} {r.user?.full_name?.split(' ').pop()}</td>
                    <td className="px-3 py-2.5 border-b border-slate-100">{r.planned_start} - {r.planned_end}</td>
                    <td className="px-3 py-2.5 border-b border-slate-100">{fmtTime(r.actual_check_in)}</td>
                    <td className="px-3 py-2.5 border-b border-slate-100">{fmtTime(r.actual_check_out)}</td>
                    <td className="px-3 py-2.5 border-b border-slate-100">{r.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Guide */}
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

      <footer className="text-center py-6 text-gray-400 text-[13px]">© 2026 Lumi Preschool</footer>
    </div>
  );
}
