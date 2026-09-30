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
  // Simple check: if allowedRange is a CIDR like 192.168.1.0/24
  // For simple deployment, we check if IP starts with the network prefix
  if (!allowedRange || allowedRange === '*') return true;

  if (allowedRange.includes('/')) {
    const [network, bits] = allowedRange.split('/');
    const networkParts = network.split('.').map(Number);
    const ipParts = clientIP.split('.').map(Number);
    const maskBits = parseInt(bits);
    const fullOctets = Math.floor(maskBits / 8);

    for (let i = 0; i < fullOctets; i++) {
      if (networkParts[i] !== ipParts[i]) return false;
    }
    return true;
  }

  // Direct IP match
  return clientIP === allowedRange;
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
