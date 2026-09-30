import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayString } from '@/lib/utils';

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

    const shifts = (data || [])
      .filter((a: any) => !a.effective_to || a.effective_to >= today)
      .map((a: any) => a.shift)
      .filter(Boolean);

    return NextResponse.json(shifts);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
