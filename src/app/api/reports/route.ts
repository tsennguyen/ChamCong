import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const lastDay = new Date(year, m, 0).getDate();

    const startDate = `${month}-01`;
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const supabase = createAdminClient();

    // Lấy danh sách giáo viên
    const { data: teachers, error: tErr } = await supabase
      .from('users')
      .select('id, full_name, gender, email, phone')
      .eq('role', 'teacher')
      .order('full_name');

    if (tErr) throw tErr;

    // Lấy điểm danh ca chính trong tháng
    const { data: records, error: rErr } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (rErr) throw rErr;

    // Lấy ca ngoài giờ trong tháng
    const { data: extraSessions } = await supabase
      .from('extra_sessions')
      .select('*')
      .gte('session_date', startDate)
      .lte('session_date', endDate);

    // Tổng hợp theo giáo viên
    const report = ((teachers || []) as Array<{ id: string; full_name: string; gender: string; email: string; phone: string | null }>).map((t) => {
      const myRecords = (records || []).filter((r: any) => r.user_id === t.id);
      const myExtras = (extraSessions || []).filter((e: any) => e.user_id === t.id);

      const daysWorked = new Set(myRecords.map((r: any) => r.attendance_date)).size;
      const totalLate = myRecords.reduce((sum: number, r: any) => sum + (r.late_minutes || 0), 0);
      const totalOT = myRecords.reduce((sum: number, r: any) => sum + (r.overtime_minutes || 0), 0);
      const totalOTAmount = myRecords.reduce((sum: number, r: any) => sum + (Number(r.overtime_amount) || 0), 0);
      const extraCount = myExtras.length;

      return {
        user: t,
        days_worked: daysWorked,
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
