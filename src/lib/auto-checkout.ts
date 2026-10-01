import { SupabaseClient } from '@supabase/supabase-js';

export interface CenterOperatingHours {
  open_time: string;
  close_time: string;
}

/**
 * Lấy cấu hình giờ mở/đóng cửa trung tâm từ app_config
 */
export async function getCenterHours(supabase: SupabaseClient): Promise<CenterOperatingHours> {
  try {
    const { data: configs } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', ['center_open_time', 'center_close_time']);

    const map: Record<string, string> = {};
    (configs || []).forEach(c => {
      map[c.key] = c.value;
    });

    return {
      open_time: map.center_open_time || '06:30',
      close_time: map.center_close_time || '22:00',
    };
  } catch {
    return { open_time: '06:30', close_time: '22:00' };
  }
}

/**
 * Chuyển đổi "HH:mm" thành tổng số phút từ 0h
 */
export function timeStrToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Lấy thời gian hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */
export function getVietnamCurrentDateTime(): { dateStr: string; timeStr: string; totalMinutes: number; now: Date } {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
  const timeStr = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }); // HH:mm:ss
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = (h || 0) * 60 + (m || 0);

  return { dateStr, timeStr, totalMinutes, now };
}

/**
 * Kiểm tra xem thời điểm hiện tại có nằm trong khung giờ mở cửa trung tâm không
 */
export function checkCenterHours(
  openTime: string,
  closeTime: string
): { allowed: boolean; reason?: string } {
  const { totalMinutes } = getVietnamCurrentDateTime();
  const openMinutes = timeStrToMinutes(openTime);
  const closeMinutes = timeStrToMinutes(closeTime);

  if (totalMinutes < openMinutes) {
    return {
      allowed: false,
      reason: `Trung tâm chưa mở cửa (Mở cửa từ ${openTime}). Vui lòng điểm danh khi trường bắt đầu hoạt động.`,
    };
  }

  if (totalMinutes >= closeMinutes) {
    return {
      allowed: false,
      reason: `Trung tâm đã đóng cửa lúc ${closeTime} (Hạn chót check-out). Không thể điểm danh vào ca mới.`,
    };
  }

  return { allowed: true };
}

/**
 * Quét và tự động đóng các ca làm việc bị quá hạn (Quên check-out)
 */
export async function processAutoCloseAttendance(supabase: SupabaseClient): Promise<{ closedCount: number }> {
  try {
    const hours = await getCenterHours(supabase);
    const closeMinutes = timeStrToMinutes(hours.close_time);
    const { dateStr: todayStr, totalMinutes: currentVnMinutes, now } = getVietnamCurrentDateTime();

    // Tìm tất cả các ca đang ở trạng thái 'checked_in'
    const { data: openRecords, error } = await supabase
      .from('attendance_records')
      .select('id, user_id, attendance_date, check_in_time, shift_id, shift_type')
      .eq('status', 'checked_in');

    if (error || !openRecords || openRecords.length === 0) {
      return { closedCount: 0 };
    }

    const toCloseIds: string[] = [];

    for (const rec of openRecords) {
      // 1. Nếu ngày điểm danh trước hôm nay -> ca ngày cũ quên check-out
      if (rec.attendance_date < todayStr) {
        toCloseIds.push(rec.id);
      }
      // 2. Nếu là hôm nay nhưng giờ hiện tại đã vượt qua giờ đóng cửa trung tâm
      else if (rec.attendance_date === todayStr && currentVnMinutes >= closeMinutes) {
        toCloseIds.push(rec.id);
      }
    }

    if (toCloseIds.length === 0) {
      return { closedCount: 0 };
    }

    // Cập nhật các bản ghi quá hạn sang 'needs_review' với ghi chú 'Quên check-out'
    for (const id of toCloseIds) {
      await supabase
        .from('attendance_records')
        .update({
          status: 'needs_review',
          check_out_time: now.toISOString(),
          check_out_note: `Quên check-out (Hệ thống tự động đóng khi hết giờ trung tâm ${hours.close_time})`,
          overtime_minutes: 0,
          overtime_amount: 0,
        })
        .eq('id', id);
    }

    return { closedCount: toCloseIds.length };
  } catch (err) {
    console.error('Error in processAutoCloseAttendance:', err);
    return { closedCount: 0 };
  }
}
