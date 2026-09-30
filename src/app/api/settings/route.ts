import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';
import { getClientIP } from '@/lib/anti-fraud';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from('app_config').select('*');
    if (error) throw error;

    const configMap: Record<string, string> = {};
    ((data || []) as Array<{ key: string; value: string }>).forEach((c) => {
      configMap[c.key] = c.value;
    });

    configMap.current_ip = getClientIP(new Headers(req.headers));

    return NextResponse.json(configMap);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const supabase = createAdminClient();
    const userId = auth.user?.id;

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
