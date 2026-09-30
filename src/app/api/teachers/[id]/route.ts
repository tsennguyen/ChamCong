import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

// GET: Lấy thông tin 1 giáo viên
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
      .from('users')
      .select('id, email, full_name, gender, phone, role, is_active, must_change_password, created_at')
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

// PUT: Cập nhật thông tin giáo viên / đổi mật khẩu / khóa tài khoản
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
    const { email, full_name, gender, phone, is_active, password } = body;

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
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền quản trị' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Không cho phép xóa chính tài khoản admin đang đăng nhập
    if (params.id === (session.user as any).id) {
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
