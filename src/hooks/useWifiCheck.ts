'use client';

import { useEffect, useState } from 'react';

interface WifiCheckResult {
  isOnWifi: boolean | null; // null = checking
  connectionType: string;
  message: string;
}

/**
 * Client-side WiFi check
 * Note: Browser APIs cannot reliably detect WiFi SSID for security reasons.
 * The real verification happens server-side via IP check.
 * This hook provides a best-effort UX hint.
 */
export function useWifiCheck() {
  const [result, setResult] = useState<WifiCheckResult>({
    isOnWifi: null,
    connectionType: 'unknown',
    message: 'Đang kiểm tra kết nối...',
  });

  useEffect(() => {
    const checkConnection = () => {
      const connection = (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (connection) {
        const type = connection.type || connection.effectiveType || 'unknown';
        const isWifi = type === 'wifi' || type === '4g'; // 4g on wifi often reports as 4g

        setResult({
          isOnWifi: isWifi,
          connectionType: type,
          message: isWifi
            ? '✅ Đã kết nối WiFi'
            : '⚠️ Vui lòng kết nối WiFi trường để chấm công',
        });
      } else {
        // Network Information API not supported - assume OK, let server validate
        setResult({
          isOnWifi: true,
          connectionType: 'unknown',
          message: '✅ Sẵn sàng chấm công',
        });
      }
    };

    checkConnection();

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', checkConnection);
      return () => connection.removeEventListener('change', checkConnection);
    }
  }, []);

  return result;
}
