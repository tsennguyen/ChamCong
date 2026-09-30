import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Lấy thông tin 1 giáo viên
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, full_name, gender, phone, role, is_active, must_change_password, created_at,
        shift_assignments:shift_assignments(
          id, shift_id, is_active,
          shift:shifts(id, name, start_time, end_time)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Không tìm thấy giáo viên' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin giáo viên / đổi mật khẩu / khóa tài khoản / gán ca
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { email, full_name, gender, phone, is_active, password, shift_ids } = body;

    const supabase = createAdminClient();
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (gender !== undefined) updateData.gender = gender;
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (password && password.trim().length >= 6) {
      updateData.password_hash = await bcrypt.hash(password.trim(), 12);
    }

    const { data: updated, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select('id, email, full_name, gender, phone, role, is_active, must_change_password, created_at')
      .single();

    if (error) throw error;

    // Đồng bộ danh sách ca làm việc được gán cho giáo viên
    if (Array.isArray(shift_ids)) {
      await supabase.from('shift_assignments').delete().eq('user_id', params.id);
      if (shift_ids.length > 0) {
        const assignments = shift_ids.map((sId: string) => ({
          user_id: params.id,
          shift_id: sId,
          effective_from: '2026-01-01',
          is_active: true,
        }));
        await supabase.from('shift_assignments').insert(assignments);
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Xóa giáo viên
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();

    // Không cho phép xóa chính tài khoản admin đang đăng nhập
    if (params.id === auth.user?.id) {
      return NextResponse.json({ error: 'Không thể xóa tài khoản của chính bạn' }, { status: 400 });
    }

    // Xóa shift assignments trước
    await supabase.from('shift_assignments').delete().eq('user_id', params.id);
    
    // Xóa user
    const { error } = await supabase.from('users').delete().eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa giáo viên' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
