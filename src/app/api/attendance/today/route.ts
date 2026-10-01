import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayString } from '@/lib/utils';
import { getClientIP, checkIPWhitelist } from '@/lib/anti-fraud';
import { processAutoCloseAttendance } from '@/lib/auto-checkout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const today = getTodayString();
    const clientIP = getClientIP(new Headers(req.headers));

    // Tự động đóng các ca quá hạn (Quên check-out)
    await processAutoCloseAttendance(supabase);

    // Lấy config mạng trường & giờ mở/đóng cửa trung tâm
    const { data: configs } = await supabase.from('app_config').select('key, value');
    const configMap: Record<string, string> = {};
    ((configs || []) as Array<{ key: string; value: string }>).forEach((c) => {
      configMap[c.key] = c.value;
    });

    const allowedRange = configMap.school_ip_range || '*';
    const isNetworkAllowed = checkIPWhitelist(clientIP, allowedRange);
    const wifiSSID = configMap.wifi_ssid || 'WiFi trường học';
    const centerOpenTime = configMap.center_open_time || '06:30';
    const centerCloseTime = configMap.center_close_time || '22:00';

    // Lấy toàn bộ records hôm nay
    const { data: records, error: recErr } = await supabase
      .from('attendance_records')
      .select(`
        *,
        user:users(id, full_name, gender),
        shift:shifts(id, name, type, start_time, end_time)
      `)
      .eq('attendance_date', today)
      .order('check_in_time', { ascending: true });

    if (recErr) throw recErr;

    const allRecords = (records || []) as Array<any>;
    const regular = allRecords.filter(
      (r) => r.shift_type === 'regular' || (!r.shift_type && r.shift?.type === 'regular')
    );
    const extra = allRecords.filter(
      (r) => r.shift_type === 'extra' || (!r.shift_type && r.shift?.type === 'extra')
    );

    return NextResponse.json({
      regular,
      extra,
      network: {
        allowed: isNetworkAllowed,
        client_ip: clientIP,
        school_ssid: wifiSSID,
      },
      center_hours: {
        open_time: centerOpenTime,
        close_time: centerCloseTime,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
