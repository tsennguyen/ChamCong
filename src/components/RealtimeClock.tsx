'use client';

import { useState, useEffect } from 'react';

export default function RealtimeClock() {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeFmt = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const dateFmt = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      setTimeStr(timeFmt.format(now));
      setDateStr(dateFmt.format(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 rounded-xl p-4 mb-4 flex items-center justify-between animate-pulse">
        <div className="h-8 w-32 bg-emerald-200/50 rounded"></div>
        <div className="h-5 w-40 bg-emerald-200/50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#e8f5e9] via-[#f1f8f3] to-[#e8f5e9] border border-[#2e8b57]/20 rounded-xl p-4 mb-4 shadow-[0_2px_10px_rgba(46,139,87,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#2e8b57] text-white shadow-sm shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-gray-900 tracking-wider font-mono">
              {timeStr}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2e8b57] bg-[#2e8b57]/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2e8b57] animate-ping" />
              Realtime
            </span>
          </div>
          <div className="text-xs font-medium text-gray-500 capitalize">
            {dateStr} (Giờ Việt Nam)
          </div>
        </div>
      </div>

      <div className="hidden sm:flex flex-col items-end text-right">
        <span className="text-[11px] font-bold text-[#2e8b57] tracking-tight uppercase">LUMI Preschool</span>
        <span className="text-[11px] text-gray-500">Mầm Non Khai Minh</span>
      </div>
    </div>
  );
}
