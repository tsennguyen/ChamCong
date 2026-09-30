import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayString } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const userId = (session.user as any).id;
    const today = getTodayString();

    const { data, error } = await supabase
      .from('shift_assignments')
      .select(`
        id, shift_id, effective_from, effective_to,
        shift:shifts(id, name, type, start_time, end_time, grace_minutes, overtime_rate)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('effective_from', today);

    if (error) throw error;

    let shifts = (data || [])
      .filter((a: any) => !a.effective_to || a.effective_to >= today)
      .map((a: any) => a.shift)
      .filter(Boolean);

    // Nếu giáo viên chưa được phân công ca nào, tự động lấy các ca đang hoạt động của trường
    if (shifts.length === 0) {
      const { data: activeShifts } = await supabase
        .from('shifts')
        .select('id, name, type, start_time, end_time, grace_minutes, overtime_rate')
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      if (activeShifts && activeShifts.length > 0) {
        shifts = activeShifts;
        // Tự động lưu phân công ca vào DB cho giáo viên
        const newAssignments = (activeShifts as Array<{ id: string }>).map((s) => ({
          user_id: userId,
          shift_id: s.id,
          effective_from: today,
          is_active: true,
        }));
        await supabase.from('shift_assignments').insert(newAssignments);
      }
    }

    return NextResponse.json(shifts);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
