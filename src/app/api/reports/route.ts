import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';
import { getCurrentMonthString } from '@/lib/utils';

function isInsufficientRecord(r: any): boolean {
  if (r.check_out_note && r.check_out_note.toLowerCase().includes('không đủ giờ')) {
    return true;
  }
  if (r.check_in_time && r.check_out_time) {
    const dur = (new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime()) / 60000;
    if (dur < 30) return true;
  }
  return false;
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || getCurrentMonthString();

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const lastDay = new Date(year, m, 0).getDate();

    const startDate = `${month}-01`;
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const supabase = createAdminClient();

    // Lấy danh sách giáo viên & admin
    const { data: staff, error: tErr } = await supabase
      .from('users')
      .select('id, full_name, gender, email, phone, role')
      .in('role', ['teacher', 'admin'])
      .order('full_name');

    if (tErr) throw tErr;

    // Lấy toàn bộ attendance records trong tháng
    const { data: records, error: rErr } = await supabase
      .from('attendance_records')
      .select('*, shift:shifts(*)')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (rErr) throw rErr;

    // Tổng hợp theo từng giáo viên/nhân sự
    const report = ((staff || []) as Array<{ id: string; full_name: string; gender: string; email: string; phone: string | null; role: string }>).map((t) => {
      const myRecords = (records || []).filter((r: any) => r.user_id === t.id);
      
      const regularRecords = myRecords.filter((r: any) => r.shift_type === 'regular' || r.shift?.type === 'regular');
      const extraRecords = myRecords.filter((r: any) => r.shift_type === 'extra' || r.shift?.type === 'extra');

      // Ca chính hợp lệ (phải checked_out và đủ giờ làm)
      const validRegular = regularRecords.filter((r: any) => r.status === 'checked_out' && !isInsufficientRecord(r));
      // Số ngày công (chỉ tính ngày đủ giờ làm)
      const daysWorked = new Set(validRegular.map((r: any) => r.attendance_date)).size;

      // Số ca không đủ giờ làm (không được tính công)
      const insufficientCount = myRecords.filter(isInsufficientRecord).length;

      // Ca ngoài giờ hợp lệ
      const validExtra = extraRecords.filter((r: any) => !isInsufficientRecord(r));
      const extraCount = validExtra.length;

      const totalLate = myRecords.reduce((sum: number, r: any) => sum + (r.late_minutes || 0), 0);
      const totalOT = validRegular.reduce((sum: number, r: any) => sum + (r.overtime_minutes || 0), 0);
      const totalOTAmount = validRegular.reduce((sum: number, r: any) => sum + (Number(r.overtime_amount) || 0), 0);

      return {
        user: t,
        days_worked: daysWorked,
        insufficient_count: insufficientCount,
        total_late_minutes: totalLate,
        total_overtime_minutes: totalOT,
        total_overtime_amount: totalOTAmount,
        extra_sessions_count: extraCount,
      };
    });

    return NextResponse.json({
      month,
      startDate,
      endDate,
      report,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
