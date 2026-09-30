import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayString } from '@/lib/utils';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const today = getTodayString();

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

    return NextResponse.json({ regular: regular || [], extra: extra || [] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
