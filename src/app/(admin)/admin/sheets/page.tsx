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
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>🔄</span> Kết nối Google Sheets
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 font-semibold uppercase">Trạng thái cấu hình</span>
            <div className="text-base font-bold mt-1 flex items-center gap-2">
              {configured ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  <span className="text-green-700">Đã kết nối Web App Script</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span className="text-amber-700">Chưa cấu hình URL Script</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 font-semibold uppercase">Spreadsheet ID</span>
            <div className="text-sm font-mono mt-1 text-gray-700">
              {spreadsheetId || 'Chưa thiết lập GOOGLE_SHEETS_ID'}
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 text-sm flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{message.type === 'success' ? '✅' : '❌'}</span>
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Chọn ngày:</label>
            <input
              type="date"
              value={syncDate}
              onChange={(e) => setSyncDate(e.target.value)}
              className="h-10 px-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#2e8b57]"
            />
          </div>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="bg-[#2e8b57] hover:bg-[#246e45] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {syncing ? 'Đang đồng bộ...' : '🚀 Đồng bộ sang Google Sheets ngay'}
          </button>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Lịch sử đồng bộ gần nhất</h3>
          <button onClick={fetchStatus} className="text-xs text-[#2e8b57] hover:underline">Làm mới</button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Thời gian</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Hướng</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Bản ghi</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Trạng thái</th>
                <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Chưa có lịch sử đồng bộ</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 border-b border-slate-100 whitespace-nowrap">{fmtTime(log.synced_at)}</td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
                      {log.direction === 'web_to_sheet' ? 'Web ➔ Sheet' : 'Sheet ➔ Web'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100">{log.records_count}</td>
                  <td className="px-4 py-3 border-b border-slate-100">
                    {log.is_success ? (
                      <span className="text-green-700 font-semibold text-xs">● Thành công</span>
                    ) : (
                      <span className="text-red-600 font-semibold text-xs">● Thất bại</span>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-slate-100 text-xs text-gray-500 max-w-xs truncate">
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
