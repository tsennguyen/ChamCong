'use client';

import { useState, useEffect } from 'react';

interface DeviceLog {
  id: string;
  fingerprint: string | null;
  user_agent: string | null;
  ip_address: string | null;
  action: string;
  created_at: string;
  user?: { full_name: string; email: string };
}

interface AuditLog {
  id: string;
  action: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  is_success: boolean;
  failure_reason: string | null;
  created_at: string;
  user?: { full_name: string; email: string };
}

export default function DevicesPage() {
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tab, setTab] = useState<'devices' | 'audit'>('devices');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/devices')
      .then((r) => r.json())
      .then((data) => {
        setDeviceLogs(data.device_logs || []);
        setAuditLogs(data.audit_logs || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmtTime = (t: string) =>
    new Date(t).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('devices')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'devices'
              ? 'border-[#2e8b57] text-[#2e8b57]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📱 Thiết bị điểm danh ({deviceLogs.length})
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'audit'
              ? 'border-[#2e8b57] text-[#2e8b57]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🛡️ Nhật ký bảo mật ({auditLogs.length})
        </button>
      </div>

      {tab === 'devices' && (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Thời gian</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Giáo viên</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Hành động</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Địa chỉ IP</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Mã thiết bị</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Trình duyệt</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                )}
                {!loading && deviceLogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có nhật ký thiết bị</td></tr>
                )}
                {deviceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 border-b border-slate-100 whitespace-nowrap">{fmtTime(log.created_at)}</td>
                    <td className="px-4 py-3 border-b border-slate-100 font-semibold whitespace-nowrap">
                      {log.user?.full_name || 'Không rõ'}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        log.action === 'check_in'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {log.action === 'check_in' ? 'Check-in' : 'Check-out'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 font-mono text-xs">{log.ip_address || '—'}</td>
                    <td className="px-4 py-3 border-b border-slate-100 font-mono text-xs text-gray-500">
                      {log.fingerprint ? `${log.fingerprint.slice(0, 12)}...` : '—'}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-xs text-gray-400 max-w-xs truncate">
                      {log.user_agent || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-200 overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-sm text-left">
              <thead>
                <tr>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Thời gian</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Người thực hiện</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Hành động</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Trạng thái</th>
                  <th className="bg-slate-50 text-slate-600 font-semibold px-4 py-3 border-b border-slate-200">Chi tiết / Lý do</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Đang tải...</td></tr>
                )}
                {!loading && auditLogs.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Chưa có nhật ký bảo mật</td></tr>
                )}
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 border-b border-slate-100 whitespace-nowrap">{fmtTime(log.created_at)}</td>
                    <td className="px-4 py-3 border-b border-slate-100 font-semibold whitespace-nowrap">
                      {log.user?.full_name || 'Hệ thống'}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 font-mono text-xs">{log.action}</td>
                    <td className="px-4 py-3 border-b border-slate-100">
                      {log.is_success ? (
                        <span className="text-green-700 font-semibold text-xs">● Hợp lệ</span>
                      ) : (
                        <span className="text-red-600 font-semibold text-xs">● Bị chặn</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-b border-slate-100 text-xs text-gray-600">
                      {log.failure_reason || (log.is_success ? 'Thao tác thành công' : 'Không xác định')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
