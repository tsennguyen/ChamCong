import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';

// GET: Danh sách ca làm việc
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('start_time', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Tạo ca làm việc mới
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const {
      name,
      type = 'regular',
      start_time,
      end_time,
      grace_minutes = 1,
      overtime_rate = 40000,
    } = body;

    if (!name || !start_time || !end_time) {
      return NextResponse.json({ error: 'Vui lòng điền tên ca, giờ bắt đầu và kết thúc' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: newShift, error } = await supabase
      .from('shifts')
      .insert({
        name: name.trim(),
        type,
        start_time: start_time.length === 5 ? `${start_time}:00` : start_time,
        end_time: end_time.length === 5 ? `${end_time}:00` : end_time,
        grace_minutes: parseInt(String(grace_minutes), 10) || 1,
        overtime_rate: type === 'extra' ? 0 : (overtime_rate !== undefined && !isNaN(parseInt(String(overtime_rate), 10)) ? parseInt(String(overtime_rate), 10) : 40000),
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Gán tự động cho các giáo viên hiện có
    const { data: teachers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'teacher')
      .eq('is_active', true);

    if (teachers && teachers.length > 0) {
      const assignments = (teachers as Array<{ id: string }>).map((t) => ({
        user_id: t.id,
        shift_id: newShift.id,
        effective_from: new Date().toISOString().slice(0, 10),
        is_active: true,
      }));
      await supabase.from('shift_assignments').insert(assignments);
    }

    return NextResponse.json(newShift, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
