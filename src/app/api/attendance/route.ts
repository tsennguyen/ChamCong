import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth-check';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateOnCheckin, calculateOnCheckout, calculateOvertimeAmount } from '@/lib/attendance-calc';
import { getGreeting } from '@/lib/greeting';
import { getTodayString, formatTimeWithSeconds } from '@/lib/utils';
import { performFraudCheck, getClientIP } from '@/lib/anti-fraud';
import { syncCheckinToSheets, syncCheckoutToSheets } from '@/lib/google-sheets';

// POST — Check-in
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { shift_id, note, device_fingerprint } = await req.json();
    if (!shift_id) {
      return NextResponse.json({ error: 'Vui lòng chọn ca làm việc' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = (session.user as any).id;
    const userGender = (session.user as any).gender;
    let userName = session.user.name || '';
    if (!userName && userId) {
      const { data: dbUser } = await supabase.from('users').select('full_name').eq('id', userId).single();
      if (dbUser?.full_name) userName = dbUser.full_name;
    }
    const today = getTodayString();

    // Anti-fraud: kiểm tra IP
    const clientIP = getClientIP(new Headers(req.headers));
    const { data: ipConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'school_ip_range')
      .single();

    const fraudCheck = performFraudCheck(clientIP, {
      school_ip_range: ipConfig?.value || '*',
    });

    if (!fraudCheck.allowed) {
      // Log audit thất bại
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'check_in_blocked',
        ip_address: clientIP,
        device_fingerprint,
        is_success: false,
        failure_reason: fraudCheck.reason,
      });
      return NextResponse.json({ error: fraudCheck.reason }, { status: 403 });
    }

    // Kiểm tra ca có được gán không
    const { data: assignment } = await supabase
      .from('shift_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('shift_id', shift_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!assignment) {
      // Kiểm tra ca có hợp lệ và đang hoạt động không
      const { data: validShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('id', shift_id)
        .eq('is_active', true)
        .maybeSingle();

      if (!validShift) {
        return NextResponse.json({ error: 'Ca làm việc không hợp lệ hoặc đã ngừng hoạt động' }, { status: 403 });
      }

      // Tự động phân công ca đang hoạt động cho giáo viên
      await supabase.from('shift_assignments').insert({
        user_id: userId,
        shift_id: shift_id,
        effective_from: today,
        is_active: true,
      });
    }

    // Kiểm tra đã check-in chưa
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', userId)
      .eq('shift_id', shift_id)
      .eq('attendance_date', today)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Bạn đã check-in ca này hôm nay rồi' }, { status: 400 });
    }

    // Lấy thông tin ca
    const { data: shift } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shift_id)
      .single();

    if (!shift) {
      return NextResponse.json({ error: 'Không tìm thấy ca làm việc' }, { status: 404 });
    }

    const now = new Date();
    const { late_minutes } = calculateOnCheckin(now, shift);

    // Ghi attendance
    const { data: record, error: insertErr } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        shift_id: shift_id,
        attendance_date: today,
        check_in_time: now.toISOString(),
        late_minutes,
        status: 'checked_in',
        shift_type: shift.type,
        check_in_ip: clientIP,
        check_in_device: device_fingerprint || null,
        check_in_note: note || null,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Log device
    await supabase.from('device_logs').insert({
      user_id: userId,
      fingerprint: device_fingerprint,
      user_agent: req.headers.get('user-agent'),
      ip_address: clientIP,
      action: 'check_in',
    });

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'check_in',
      ip_address: clientIP,
      device_fingerprint,
      metadata: { shift_id, shift_name: shift.name, late_minutes },
      is_success: true,
    });

    // Sync Google Sheets (fire & forget)
    syncCheckinToSheets({
      teacher_name: userName,
      date: today,
      check_in_time: formatTimeWithSeconds(now),
      shift_name: shift.name,
      shift_type: shift.type,
      late_minutes,
      note,
    }).catch(() => {});

    const greeting = getGreeting(userGender, userName);

    return NextResponse.json({
      success: true,
      message: shift.type === 'regular'
        ? `${greeting}! Điểm danh ca ${shift.name} ngày ${today}`
        : `${greeting}! Điểm danh ca ngoài giờ ngày ${today}`,
      data: {
        attendance: record,
        greeting,
        late_minutes,
        shift_type: shift.type,
        shift_name: shift.name,
      },
    });
  } catch (error: unknown) {
    console.error('Check-in error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT — Check-out
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { attendance_id, note, device_fingerprint } = await req.json();
    if (!attendance_id) {
      return NextResponse.json({ error: 'Thiếu attendance_id' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const userId = (session.user as any).id;
    const userGender = (session.user as any).gender;
    let userName = session.user.name || '';
    if (!userName && userId) {
      const { data: dbUser } = await supabase.from('users').select('full_name').eq('id', userId).single();
      if (dbUser?.full_name) userName = dbUser.full_name;
    }
    const clientIP = getClientIP(new Headers(req.headers));

    // Lấy record + shift
    const { data: record } = await supabase
      .from('attendance_records')
      .select('*, shift:shifts(*)')
      .eq('id', attendance_id)
      .eq('user_id', userId)
      .single();

    if (!record) {
      return NextResponse.json({ error: 'Không tìm thấy bản ghi' }, { status: 404 });
    }

    if (record.status !== 'checked_in') {
      return NextResponse.json({ error: 'Đã check-out rồi' }, { status: 400 });
    }

    const now = new Date();
    const shift = record.shift;
    const { overtime_minutes, overtime_amount } = calculateOnCheckout(now, shift);

    const { data: updated, error: updateErr } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: now.toISOString(),
        overtime_minutes,
        overtime_amount,
        status: 'checked_out',
        check_out_ip: clientIP,
        check_out_device: device_fingerprint || null,
        check_out_note: note || null,
      })
      .eq('id', attendance_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Log
    await supabase.from('device_logs').insert({
      user_id: userId,
      fingerprint: device_fingerprint,
      user_agent: req.headers.get('user-agent'),
      ip_address: clientIP,
      action: 'check_out',
    });

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'check_out',
      ip_address: clientIP,
      device_fingerprint,
      metadata: { attendance_id, overtime_minutes, overtime_amount },
      is_success: true,
    });

    // Sync Google Sheets
    syncCheckoutToSheets({
      teacher_name: userName,
      date: record.attendance_date,
      check_out_time: formatTimeWithSeconds(now),
      shift_name: shift.name,
      shift_type: shift.type,
      overtime_minutes,
      overtime_amount,
      note,
    }).catch(() => {});

    const greeting = getGreeting(userGender, userName);

    return NextResponse.json({
      success: true,
      message: `${greeting}! Check-out thành công.`,
      data: {
        attendance: updated,
        greeting,
        overtime_minutes,
        overtime_amount,
      },
    });
  } catch (error: unknown) {
    console.error('Check-out error:', error);
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET — Danh sách attendance (admin)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const userId = url.searchParams.get('user_id');
    const shiftType = url.searchParams.get('shift_type');

    let query = supabase
      .from('attendance_records')
      .select(`
        *,
        user:users(id, full_name, gender),
        shift:shifts(id, name, type, start_time, end_time)
      `)
      .order('check_in_time', { ascending: true });

    if (date) query = query.eq('attendance_date', date);
    if (userId) query = query.eq('user_id', userId);
    if (shiftType) query = query.eq('shift_type', shiftType);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — Xóa bản ghi chấm công (admin)
export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.allowed) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Thiếu id bản ghi' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Đã xóa bản ghi chấm công' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi hệ thống';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
