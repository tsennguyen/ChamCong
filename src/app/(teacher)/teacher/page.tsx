'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWifiCheck } from '@/hooks/useWifiCheck';
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';
import { getTodayString, formatTime, formatDate } from '@/lib/utils';
import { formatMinutes, formatCurrency } from '@/lib/attendance-calc';
import { getGreeting } from '@/lib/greeting';
import { ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Shift, AttendanceRecord, ExtraSession } from '@/types';

export default function TeacherPage() {
  const { user } = useAuth();
  const { isOnWifi, connectionType, message: wifiMessage } = useWifiCheck();
  const todayString = getTodayString();
  const { regular, extra, loading: statsLoading } = useRealtimeAttendance(todayString);
  const fingerprint = useDeviceFingerprint();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [isCheckinLoading, setIsCheckinLoading] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Fetch user shifts
    const fetchShifts = async () => {
      try {
        const res = await fetch('/api/shifts/my-shifts');
        if (res.ok) {
          const data = await res.json();
          setShifts(data);
          if (data.length > 0) {
            setSelectedShiftId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching shifts', error);
      }
    };
    fetchShifts();
  }, []);

  const handleCheckin = async () => {
    if (!selectedShiftId) return;
    setIsCheckinLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: selectedShiftId, device_fingerprint: fingerprint }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message || 'Check-in thành công!' });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Check-in thất bại.' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Có lỗi xảy ra khi Check-in.' });
    } finally {
      setIsCheckinLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!myTodayRecord) return;
    setIsCheckoutLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: myTodayRecord.id, device_fingerprint: fingerprint }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message || 'Check-out thành công!' });
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Check-out thất bại.' });
      }
    } catch (error) {
      setActionMessage({ type: 'error', text: 'Có lỗi xảy ra khi Check-out.' });
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // Find current user's record for today's selected shift
  const myTodayRecord = regular.find(r => r.user_id === user?.id && r.shift_id === selectedShiftId && r.attendance_date === todayString);
  const isCheckedIn = !!myTodayRecord;
  const isCheckedOut = isCheckedIn && myTodayRecord.status === 'checked_out';

  return (
    <div className="space-y-6">
      {/* SECTION 1: Check-in/Check-out Card */}
      <section className="bg-white rounded-xl shadow-md border border-lumi-green p-6">
        <h2 className="text-xl font-bold text-lumi-green mb-4 flex items-center gap-2">
          <CheckCircle className="text-lumi-green" /> 📋 ĐIỂM DANH
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ca làm việc</label>
          <select 
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-lumi-green focus:ring-lumi-green p-2 border"
            value={selectedShiftId}
            onChange={(e) => setSelectedShiftId(e.target.value)}
            disabled={shifts.length === 0}
          >
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>
            ))}
            {shifts.length === 0 && <option>Không có ca làm việc</option>}
          </select>
        </div>

        <div className={`p-3 rounded-md mb-4 text-sm flex items-center gap-2 ${isOnWifi ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
          <AlertCircle size={16} />
          {wifiMessage}
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={handleCheckin}
            disabled={isCheckedIn || !isOnWifi || isCheckinLoading || !selectedShiftId}
            className="flex-1 bg-lumi-green hover:bg-green-700 text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCheckinLoading ? 'ĐANG XỬ LÝ...' : '🟢 CHECK-IN'}
          </button>
          <button
            onClick={handleCheckout}
            disabled={!isCheckedIn || isCheckedOut || !isOnWifi || isCheckoutLoading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCheckoutLoading ? 'ĐANG XỬ LÝ...' : '🔴 CHECK-OUT'}
          </button>
        </div>

        {actionMessage && (
          <div className={`p-3 rounded-md mb-4 ${actionMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {actionMessage.text}
          </div>
        )}

        {isCheckedIn && (
          <div className="bg-lumi-green-light p-4 rounded-lg text-sm text-gray-800">
            <p><strong>Thời gian Check-in:</strong> {myTodayRecord.check_in_time}</p>
            {myTodayRecord.late_minutes > 0 && <p className="text-red-600"><strong>Đi trễ:</strong> {formatMinutes(myTodayRecord.late_minutes)}</p>}
            {isCheckedOut && (
              <>
                <p><strong>Thời gian Check-out:</strong> {myTodayRecord.check_out_time}</p>
                {myTodayRecord.overtime_minutes > 0 && <p className="text-lumi-green"><strong>Tăng ca:</strong> {formatMinutes(myTodayRecord.overtime_minutes)}</p>}
              </>
            )}
          </div>
        )}
      </section>

      {/* SECTION 2: Today's Regular Shift Stats */}
      <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="text-lumi-yellow" /> 📊 THỐNG KÊ CA CHÍNH HÔM NAY ({formatDate(new Date())})
        </h2>
        {statsLoading ? (
          <div className="text-center py-4 text-gray-500">Đang tải dữ liệu...</div>
        ) : regular.length === 0 ? (
          <div className="text-center py-4 text-gray-500 italic">Chưa có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Giáo viên</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">In/Out</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Trễ</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Tăng ca</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {regular.map((r, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.user?.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>IN: {r.check_in_time || '--'}</div>
                      <div>OUT: {r.check_out_time || '--'}</div>
                    </td>
                    <td className="px-4 py-3 text-red-500">{r.late_minutes > 0 ? formatMinutes(r.late_minutes) : '-'}</td>
                    <td className="px-4 py-3 text-lumi-green">{r.overtime_minutes > 0 ? formatMinutes(r.overtime_minutes) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 3: Today's Extra Session Stats */}
      {extra.length > 0 && (
        <section className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="text-blue-500" /> 📊 THỐNG KÊ CA NGOÀI GIỜ HÔM NAY ({formatDate(new Date())})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Giáo viên</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">Ca</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase">In/Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {extra.map((r: any, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.user?.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.shift?.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>IN: {r.check_in_time || '--'}</div>
                      <div>OUT: {r.check_out_time || '--'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SECTION 4: Usage Guide */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200">
        <button 
          className="w-full px-6 py-4 flex justify-between items-center text-left font-bold text-gray-700 hover:bg-gray-50 rounded-xl"
          onClick={() => setShowGuide(!showGuide)}
        >
          <span>📖 HƯỚNG DẪN SỬ DỤNG</span>
          {showGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
        {showGuide && (
          <div className="px-6 pb-6 text-sm text-gray-600 space-y-3">
            <p>1. Kết nối với <strong>WiFi của trường</strong> để có thể điểm danh.</p>
            <p>2. Đầu ca làm việc, chọn ca và bấm <strong>Check-in</strong>.</p>
            <p>3. Cuối ca làm việc, bấm <strong>Check-out</strong>.</p>
            <div className="bg-gray-50 p-3 rounded mt-2">
              <ul className="list-disc pl-5 space-y-1">
                <li>Cho phép trễ tối đa: 1 phút (sau 1 phút sẽ bị tính trễ)</li>
                <li>Tăng ca tính từ sau giờ kết thúc ca (Rate: 40,000đ/giờ)</li>
                <li>Ca ngoài giờ không tính tăng ca, chỉ ghi nhận thời gian</li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
