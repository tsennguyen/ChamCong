import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

// GET: Danh sách giáo viên (cho Admin)
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, gender, phone, role, is_active, must_change_password, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST: Thêm giáo viên mới
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { email, password, full_name, gender, phone, role = 'teacher' } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Vui lòng nhập họ tên, email và mật khẩu' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Kiểm tra email trùng
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Email này đã tồn tại trong hệ thống' }, { status: 400 });
    }

    // Hash mật khẩu
    const passwordHash = await bcrypt.hash(password, 12);

    // Tạo giáo viên
    const { data: newUser, error: createErr } = await supabase
      .from('users')
      .insert({
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        full_name: full_name.trim(),
        gender: gender || 'female',
        phone: phone ? phone.trim() : null,
        role: role || 'teacher',
        is_active: true,
        must_change_password: true,
      })
      .select('id, email, full_name, gender, phone, role, is_active, must_change_password, created_at')
      .single();

    if (createErr) throw createErr;

    // Tự động gán vào tất cả ca làm việc đang hoạt động để giáo viên có thể điểm danh ngay
    const { data: activeShifts } = await supabase
      .from('shifts')
      .select('id')
      .eq('is_active', true);

    if (activeShifts && activeShifts.length > 0) {
      const assignments = (activeShifts as Array<{ id: string }>).map((s) => ({
        user_id: newUser.id,
        shift_id: s.id,
        effective_from: new Date().toISOString().slice(0, 10),
        is_active: true,
      }));
      await supabase.from('shift_assignments').insert(assignments);
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
