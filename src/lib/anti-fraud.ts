import type { AppConfig } from '@/types';

interface FraudCheckResult {
  allowed: boolean;
  reason?: string;
  checks: {
    wifi: boolean | null; // null = not checked
    ip: boolean | null;
    geo: boolean | null;
  };
}

/**
 * Server-side: Kiểm tra IP của request có nằm trong whitelist không
 */
export function checkIPWhitelist(
  clientIP: string,
  allowedRange: string
): boolean {
  if (!allowedRange || allowedRange.trim() === '' || allowedRange.trim() === '*') return true;
  const cleanClient = clientIP.trim();

  // Tách danh sách IP theo dấu phẩy, chấm phẩy, khoảng trắng hoặc dòng mới
  const ranges = allowedRange.split(/[\s,;]+/).map(r => r.trim()).filter(Boolean);
  if (ranges.includes('*')) return true;

  for (const r of ranges) {
    if (r === cleanClient) return true;

    if (r.includes('/')) {
      const [network, bits] = r.split('/');
      const maskBits = parseInt(bits, 10);
      const networkParts = network.split('.').map(Number);
      const ipParts = cleanClient.split('.').map(Number);

      if (networkParts.length === 4 && ipParts.length === 4 && !isNaN(maskBits)) {
        const fullOctets = Math.floor(maskBits / 8);
        let match = true;
        for (let i = 0; i < fullOctets; i++) {
          if (networkParts[i] !== ipParts[i]) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    }
  }

  return false;
}

/**
 * Client-side: Kiểm tra WiFi SSID (qua Network Information API - limited support)
 * Fallback: chỉ ghi log, không block
 */
export async function checkWifiSSID(expectedSSID: string): Promise<boolean> {
  // Network Information API is very limited in browsers
  // We primarily rely on IP check server-side
  // This is a best-effort client-side check
  try {
    const connection = (navigator as any).connection;
    if (connection && connection.type === 'wifi') {
      // Cannot reliably get SSID from browser for security reasons
      // Return true if on WiFi, let server IP check do the real validation
      return true;
    }
    // If on cellular or unknown, still allow but log
    return true;
  } catch {
    return true; // Don't block on check failure
  }
}

/**
 * Server-side: Tổng hợp kiểm tra chống gian lận
 */
export function performFraudCheck(
  clientIP: string,
  config: { school_ip_range?: string }
): FraudCheckResult {
  const ipRange = config.school_ip_range || '*';
  const ipCheck = checkIPWhitelist(clientIP, ipRange);

  // If IP range is wildcard, allow everything (for initial setup)
  if (ipRange === '*') {
    return {
      allowed: true,
      checks: { wifi: null, ip: true, geo: null },
    };
  }

  if (!ipCheck) {
    return {
      allowed: false,
      reason: 'Vui lòng kết nối WiFi trường để chấm công',
      checks: { wifi: null, ip: false, geo: null },
    };
  }

  return {
    allowed: true,
    checks: { wifi: null, ip: true, geo: null },
  };
}

/**
 * Get client IP from request headers (works with Vercel)
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    '0.0.0.0'
  );
}
