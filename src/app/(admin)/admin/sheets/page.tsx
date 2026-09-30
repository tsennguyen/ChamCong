'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTodayString } from '@/lib/utils';

interface SyncLog {
  id: string;
  direction: string;
  sheet_tab: string | null;
  records_count: number;
  is_success: boolean;
  error_message: string | null;
  synced_at: string;
}

export default function SheetsSyncPage() {
  const [configured, setConfigured] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncDate, setSyncDate] = useState(getTodayString());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      setConfigured(data.configured);
      setSpreadsheetId(data.spreadsheet_id);
      setLogs(data.logs || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: 'web_to_sheet', date: syncDate }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message || data.error || 'Đồng bộ thất bại' });
      }
      fetchStatus();
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi đồng bộ' });
    } finally {
      setSyncing(false);
    }
  };

  const fmtTime = (t: string) =>
    new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-5">
      {/* Status Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#eef2f0] p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 tracking-tight">
          Kết nối Google Sheets
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
          <div className="bg-[#f8faf9] p-4 rounded-xl border border-[#eef2f0]">
            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Trạng thái cấu hình</span>
            <div className="text-sm sm:text-base font-bold mt-1 flex items-center gap-2">
              {configured ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span className="text-emerald-700">Đã kết nối Web App Script</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shrink-0" />
                  <span className="text-amber-700">Chưa cấu hình URL Script</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-[#f8faf9] p-4 rounded-xl border border-[#eef2f0]">
            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Spreadsheet ID</span>
            <div className="text-xs sm:text-sm font-mono mt-1 text-gray-800 break-all font-semibold">
              {spreadsheetId || 'Chưa thiết lập GOOGLE_SHEETS_ID'}
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl mb-5 text-xs sm:text-sm font-medium ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm font-bold text-gray-700 whitespace-nowrap">Chọn ngày:</label>
            <input
              type="date"
              value={syncDate}
              onChange={(e) => setSyncDate(e.target.value)}
              className="h-10 px-3 border border-[#d8e3dc] rounded-xl text-xs sm:text-sm font-semibold outline-none focus:border-[#2e8b57] bg-[#f8faf9] focus:bg-white"
            />
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center disabled:opacity-50 cursor-pointer border-none"
          >
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ sang Google Sheets'}
          </button>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#eef2f0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#eef2f0] flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm sm:text-base">Lịch sử đồng bộ gần nhất</h3>
          <button onClick={fetchStatus} className="text-xs font-bold text-[#1e6b3e] hover:underline cursor-pointer bg-transparent border-none">Làm mới</button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-[#f8faf9] text-gray-700 font-bold uppercase tracking-wider border-b border-[#eef2f0]">
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Hướng</th>
                <th className="px-4 py-3">Bản ghi</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f1] font-medium">
              {loading && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Đang tải...</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">Chưa có lịch sử đồng bộ</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#f9fbf9] transition-colors">
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">{fmtTime(log.synced_at)}</td>
                  <td className="px-4 py-3">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {log.direction === 'web_to_sheet' ? 'Web ➔ Sheet' : 'Sheet ➔ Web'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{log.records_count}</td>
                  <td className="px-4 py-3">
                    {log.is_success ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[11px]">● Thành công</span>
                    ) : (
                      <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold text-[11px]">● Thất bại</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {log.error_message || 'OK'}
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
