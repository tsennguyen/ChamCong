import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.' }, { status: 401 });
    }

    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' }, { status: 400 });
    }

    if (new_password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const sessionUser = session.user as any;
    const userId = sessionUser.id;
    const userEmail = sessionUser.email ? sessionUser.email.trim().toLowerCase() : null;

    // Tìm tài khoản theo id hoặc email
    let query = supabase.from('users').select('id, email, password_hash, role');
    if (userId) {
      query = query.eq('id', userId);
    } else if (userEmail) {
      query = query.ilike('email', userEmail);
    } else {
      return NextResponse.json({ error: 'Không xác định được tài khoản' }, { status: 400 });
    }

    const { data: user, error: findErr } = await query.maybeSingle();

    if (findErr || !user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản người dùng' }, { status: 404 });
    }

    // Kiểm tra mật khẩu hiện tại
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không chính xác' }, { status: 400 });
    }

    // Cập nhật mật khẩu mới và xóa cờ must_change_password
    const hashedPassword = await bcrypt.hash(new_password, 12);
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Lỗi cập nhật dữ liệu: ' + updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      role: user.role,
      email: user.email,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
