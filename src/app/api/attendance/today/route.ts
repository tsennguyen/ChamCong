import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayString } from '@/lib/utils';

import { getClientIP, checkIPWhitelist } from '@/lib/anti-fraud';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const today = getTodayString();
    const clientIP = getClientIP(new Headers(req.headers));

    // Lấy config mạng trường
    const { data: configs } = await supabase.from('app_config').select('key, value');
    const configMap: Record<string, string> = {};
    ((configs || []) as Array<{ key: string; value: string }>).forEach((c) => {
      configMap[c.key] = c.value;
    });

    const allowedRange = configMap.school_ip_range || '*';
    const isNetworkAllowed = checkIPWhitelist(clientIP, allowedRange);
    const wifiSSID = configMap.wifi_ssid || 'WiFi trường học';

    // Lấy attendance ca hành chính
    const { data: regular, error: regErr } = await supabase
      .from('attendance_records')
      .select(`
        *,
        user:users(id, full_name, gender),
        shift:shifts(id, name, type, start_time, end_time)
      `)
      .eq('attendance_date', today)
      .order('check_in_time', { ascending: true });

    if (regErr) throw regErr;

    // Lấy ca ngoài giờ
    const { data: extra, error: extErr } = await supabase
      .from('extra_sessions')
      .select(`*, user:users(id, full_name, gender)`)
      .eq('session_date', today)
      .order('planned_start', { ascending: true });

    if (extErr) throw extErr;

    return NextResponse.json({
      regular: regular || [],
      extra: extra || [],
      network: {
        allowed: isNetworkAllowed,
        client_ip: clientIP,
        school_ssid: wifiSSID,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
