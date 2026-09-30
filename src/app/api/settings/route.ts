import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from('app_config').select('*');
    if (error) throw error;

    const configMap: Record<string, string> = {};
    ((data || []) as Array<{ key: string; value: string }>).forEach((c) => {
      configMap[c.key] = c.value;
    });

    return NextResponse.json(configMap);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const body = await req.json();
    const supabase = createAdminClient();
    const userId = (session.user as any).id;

    const updates = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }));

    for (const item of updates) {
      const { error } = await supabase
        .from('app_config')
        .upsert(item, { onConflict: 'key' });
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Cập nhật cài đặt thành công' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
