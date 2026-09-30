import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const [deviceRes, auditRes] = await Promise.all([
      supabase
        .from('device_logs')
        .select('*, user:users(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('audit_logs')
        .select('*, user:users(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    return NextResponse.json({
      device_logs: deviceRes.data || [],
      audit_logs: auditRes.data || [],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
