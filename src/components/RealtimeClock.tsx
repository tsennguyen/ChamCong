'use client';

import { useState, useEffect } from 'react';

interface RealtimeClockProps {
  rightElement?: React.ReactNode;
  lang?: 'vi' | 'en';
}

export default function RealtimeClock({ rightElement, lang = 'vi' }: RealtimeClockProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const locale = lang === 'en' ? 'en-US' : 'vi-VN';
      const timeFmt = new Intl.DateTimeFormat(locale, {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      const dateFmt = new Intl.DateTimeFormat(locale, {
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
  }, [lang]);

  if (!timeStr) {
    return (
      <div className="bg-[#f0f9f4] border border-[#2e8b57]/15 rounded-xl p-3 mb-3 flex items-center justify-between animate-pulse">
        <div className="h-7 w-28 bg-emerald-200/50 rounded"></div>
        <div className="h-4 w-24 bg-emerald-200/50 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#f0f9f4] border border-[#2e8b57]/15 rounded-xl px-3 sm:px-3.5 py-2.5 mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2e8b57] text-white shadow-xs shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-wider font-mono leading-none">
            {timeStr}
          </div>
          <div className="text-[11px] sm:text-xs font-medium text-gray-500 capitalize mt-0.5">
            {dateStr}
          </div>
        </div>
      </div>

      {rightElement && (
        <div className="shrink-0">
          {rightElement}
        </div>
      )}
    </div>
  );
}
