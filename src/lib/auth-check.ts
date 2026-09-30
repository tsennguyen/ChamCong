import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export interface AdminAuthResult {
  allowed: boolean;
  status: number;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Kiểm tra quyền quản trị viên (Admin) cho các API routes.
 * Có cơ chế đối soát database nếu JWT cookie bị thiếu field 'role'.
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return {
        allowed: false,
        status: 401,
        error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.',
      };
    }

    const sessionUser = session.user as any;
    const email = sessionUser.email?.trim().toLowerCase();
    const id = sessionUser.id;
    let role = sessionUser.role;

    // Nếu trong session role chưa phải admin hoặc bị undefined,
    // ta truy vấn trực tiếp bảng users theo email để đảm bảo tính xác thực tuyệt đối
    if (role !== 'admin' && email) {
      const supabase = createAdminClient();
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('email', email)
        .maybeSingle();

      if (dbUser && dbUser.is_active) {
        role = dbUser.role;
      }
    }

    if (role !== 'admin') {
      return {
        allowed: false,
        status: 403,
        error: `Tài khoản (${email || 'hiện tại'}) có vai trò "${role || 'giáo viên'}", không có quyền quản trị. Vui lòng đăng nhập tài khoản Admin (admin@lumi.edu.vn).`,
      };
    }

    return {
      allowed: true,
      status: 200,
      user: {
        id: id || sessionUser.id,
        email: email || sessionUser.email,
        name: sessionUser.name || 'Admin',
        role: 'admin',
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi xác thực người dùng';
    return {
      allowed: false,
      status: 500,
      error: msg,
    };
  }
}
