import type { Shift } from '@/types';

interface AttendanceCalcResult {
  late_minutes: number;
  overtime_minutes: number;
  overtime_amount: number;
}

/**
 * Parse time string "HH:mm" to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Parse a timestamp to minutes since midnight in Vietnam timezone
 */
function timestampToMinutes(timestamp: Date): number {
  const vnTime = new Date(timestamp.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return vnTime.getHours() * 60 + vnTime.getMinutes();
}

/**
 * Tính đi trễ khi check-in
 * 
 * Logic:
 * - Nếu check_in <= shift_start + grace → đi trễ = 0
 * - Nếu check_in > shift_start + grace → đi trễ = check_in - shift_start (phút)
 * 
 * Ví dụ: Ca 7:00, grace 1 phút
 * - Check-in 07:01 → trễ 0 (trong grace)
 * - Check-in 07:02 → trễ 2 phút
 */
export function calculateLateMinutes(
  checkInTime: Date,
  shift: Shift
): number {
  const checkInMinutes = timestampToMinutes(checkInTime);
  const shiftStartMinutes = timeToMinutes(shift.start_time);
  const graceMinutes = shift.grace_minutes ?? 1;

  // Within grace period → not late
  if (checkInMinutes <= shiftStartMinutes + graceMinutes) {
    return 0;
  }

  // Late = actual check-in minus shift start (not minus grace)
  return checkInMinutes - shiftStartMinutes;
}

/**
 * Tính tăng ca khi check-out (chỉ cho ca hành chính 'regular')
 * 
 * Logic:
 * - Nếu check_out > shift_end → tăng ca = check_out - shift_end (phút)
 * - Tiền tăng ca = (tăng_ca_phút / 60) × overtime_rate
 * 
 * Ví dụ: Ca kết thúc 17:00, rate 40,000đ/h
 * - Check-out 17:30 → tăng ca 30 phút → 20,000đ
 * - Check-out 18:00 → tăng ca 60 phút → 40,000đ
 */
export function calculateOvertimeMinutes(
  checkOutTime: Date,
  shift: Shift
): number {
  if (shift.type !== 'regular') return 0;

  const checkOutMinutes = timestampToMinutes(checkOutTime);
  const shiftEndMinutes = timeToMinutes(shift.end_time);

  if (checkOutMinutes > shiftEndMinutes) {
    return checkOutMinutes - shiftEndMinutes;
  }

  return 0;
}

/**
 * Tính về sớm khi check-out
 */
export function calculateEarlyMinutes(
  checkOutTime: Date,
  shift: Shift
): number {
  const checkOutMinutes = timestampToMinutes(checkOutTime);
  const shiftEndMinutes = timeToMinutes(shift.end_time);

  if (checkOutMinutes < shiftEndMinutes) {
    return shiftEndMinutes - checkOutMinutes;
  }

  return 0;
}

/**
 * Tính tiền tăng ca (chỉ ca regular)
 */
export function calculateOvertimeAmount(
  overtimeMinutes: number,
  overtimeRate: number
): number {
  if (!overtimeRate || overtimeRate <= 0) return 0;
  return Math.round((overtimeMinutes / 60) * overtimeRate);
}

/**
 * Tính toàn bộ khi check-in
 */
export function calculateOnCheckin(
  checkInTime: Date,
  shift: Shift
): { late_minutes: number } {
  return {
    late_minutes: calculateLateMinutes(checkInTime, shift),
  };
}

/**
 * Tạo ghi chú thông minh tự động khi check-out
 */
export function generateAttendanceNote(params: {
  shift: Shift;
  checkInTime: Date;
  checkOutTime: Date;
  lateMinutes: number;
  userNote?: string | null;
}): {
  note: string;
  earlyMinutes: number;
  overtimeMinutes: number;
  overtimeAmount: number;
  durationMinutes: number;
} {
  const { shift, checkInTime, checkOutTime, lateMinutes, userNote } = params;

  const isRegular = shift.type === 'regular';
  const earlyMinutes = calculateEarlyMinutes(checkOutTime, shift);
  const overtimeMinutes = isRegular ? calculateOvertimeMinutes(checkOutTime, shift) : 0;
  const overtimeAmount = isRegular ? calculateOvertimeAmount(overtimeMinutes, shift.overtime_rate || 0) : 0;

  // Thời gian thực tế làm việc (phút)
  const durationMinutes = Math.max(0, Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000));

  // Thời lượng chuẩn của ca (phút)
  const startM = timeToMinutes(shift.start_time);
  const endM = timeToMinutes(shift.end_time);
  const shiftDuration = endM >= startM ? (endM - startM) : (24 * 60 - startM + endM);

  const tags: string[] = [];

  // 1. Kiểm tra làm không đủ giờ (dưới 30 phút hoặc dưới 50% ca)
  if (durationMinutes < 30 || durationMinutes < Math.min(60, shiftDuration * 0.5)) {
    tags.push(`Không đủ giờ làm (${durationMinutes}p)`);
  }

  // 2. Đi trễ
  if (lateMinutes > 0) {
    tags.push(`Trễ ${lateMinutes}p`);
  }

  // 3. Về sớm
  if (earlyMinutes > 0) {
    tags.push(`Về sớm ${formatMinutes(earlyMinutes)}`);
  }

  // 4. Tăng ca (chỉ ca chính)
  if (isRegular && overtimeMinutes > 0) {
    tags.push(`Tăng ca +${overtimeMinutes}p`);
  }

  // 5. Nếu không trễ, không sớm, không thiếu giờ
  if (tags.length === 0) {
    tags.push('Đủ giờ làm');
  }

  // 6. Ghi chú cá nhân người dùng nhập (nếu có)
  if (userNote && userNote.trim()) {
    tags.push(`(${userNote.trim()})`);
  }

  return {
    note: tags.join(' • '),
    earlyMinutes,
    overtimeMinutes,
    overtimeAmount,
    durationMinutes,
  };
}

/**
 * Tính toàn bộ khi check-out
 */
export function calculateOnCheckout(
  checkOutTime: Date,
  shift: Shift
): AttendanceCalcResult {
  const isRegular = shift.type === 'regular';
  const overtime_minutes = isRegular ? calculateOvertimeMinutes(checkOutTime, shift) : 0;
  const overtime_amount = isRegular ? calculateOvertimeAmount(overtime_minutes, shift.overtime_rate) : 0;

  return {
    late_minutes: 0,
    overtime_minutes,
    overtime_amount,
  };
}

/**
 * Format phút thành chuỗi đọc được
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0 phút';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
}

/**
 * Format tiền VND
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}
