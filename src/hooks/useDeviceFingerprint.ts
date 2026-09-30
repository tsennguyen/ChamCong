'use client';

import { useEffect, useState } from 'react';

/**
 * Simple device fingerprint based on browser properties
 * For more robust fingerprinting, consider FingerprintJS library
 */
export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string>('');

  useEffect(() => {
    const generateFingerprint = async () => {
      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        (navigator as any).deviceMemory || 'unknown',
      ];

      const raw = components.join('|');

      // Simple hash using Web Crypto API
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(raw);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setFingerprint(hashHex.substring(0, 32));
      } catch {
        // Fallback: simple string hash
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
          const char = raw.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        setFingerprint(Math.abs(hash).toString(16).padStart(8, '0'));
      }
    };

    generateFingerprint();
  }, []);

  return fingerprint;
}
