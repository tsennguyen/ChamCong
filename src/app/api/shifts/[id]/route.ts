import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

// GET: Lấy thông tin 1 ca làm việc
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy ca làm việc' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: Cập nhật ca làm việc
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền quản trị' }, { status: 403 });
    }

    const body = await req.json();
    const { name, type, start_time, end_time, grace_minutes, overtime_rate, is_active } = body;

    const supabase = createAdminClient();
    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (start_time !== undefined) {
      updateData.start_time = start_time.length === 5 ? `${start_time}:00` : start_time;
    }
    if (end_time !== undefined) {
      updateData.end_time = end_time.length === 5 ? `${end_time}:00` : end_time;
    }
    if (grace_minutes !== undefined) {
      updateData.grace_minutes = parseInt(String(grace_minutes), 10) || 1;
    }
    if (overtime_rate !== undefined) {
      updateData.overtime_rate = parseInt(String(overtime_rate), 10) || 40000;
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updated, error } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Xóa ca làm việc
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền quản trị' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Xóa shift assignments trước
    await supabase.from('shift_assignments').delete().eq('shift_id', params.id);

    // Xóa shift
    const { error } = await supabase.from('shifts').delete().eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa ca làm việc' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
