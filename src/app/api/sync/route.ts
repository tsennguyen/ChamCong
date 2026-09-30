import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';
import { syncToSheets, fetchFromSheets } from '@/lib/google-sheets';

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({
      configured: !!process.env.GOOGLE_APPS_SCRIPT_URL,
      spreadsheet_id: process.env.GOOGLE_SHEETS_ID ? `${process.env.GOOGLE_SHEETS_ID.slice(0, 8)}...` : null,
      logs: logs || [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { direction, date } = body;
    const supabase = createAdminClient();

    if (direction === 'web_to_sheet') {
      // Sync today or specific date's attendance to sheet
      const targetDate = date || new Date().toISOString().slice(0, 10);
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select('*, user:users(full_name), shift:shifts(name, type)')
        .eq('attendance_date', targetDate);

      if (error) throw error;

      const formatted = ((records || []) as any[]).map((r) => ({
        teacher_name: r.user?.full_name || 'Giáo viên',
        date: r.attendance_date,
        check_in_time: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
        check_out_time: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
        shift_name: r.shift?.name || '',
        shift_type: r.shift_type,
        late_minutes: r.late_minutes || 0,
        overtime_minutes: r.overtime_minutes || 0,
        overtime_amount: r.overtime_amount || 0,
      }));

      const syncRes = await syncToSheets({
        action: 'sync_day',
        data: { records: formatted, date: targetDate },
      });

      await supabase.from('sync_logs').insert({
        direction: 'web_to_sheet',
        sheet_tab: `Ngày ${targetDate}`,
        records_count: formatted.length,
        is_success: syncRes.success,
        error_message: syncRes.message || null,
      });

      return NextResponse.json({
        success: syncRes.success,
        message: syncRes.success
          ? `Đã đồng bộ ${formatted.length} bản ghi sang Google Sheets`
          : `Lỗi đồng bộ: ${syncRes.message}`,
      });
    }

    return NextResponse.json({ error: 'Chức năng chưa hỗ trợ hướng này' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
