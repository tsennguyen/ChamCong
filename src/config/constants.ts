export const APP_NAME = 'Lumi Preschool';
export const APP_DESCRIPTION = 'Hệ thống chấm công giáo viên';

// Default shift values
export const DEFAULT_SHIFT_START = '07:00';
export const DEFAULT_SHIFT_END = '17:00';
export const DEFAULT_GRACE_MINUTES = 1;
export const DEFAULT_OVERTIME_RATE = 40000; // VND per hour

// Anti-fraud
export const WIFI_CHECK_ENABLED = true;
export const DEVICE_LOG_ENABLED = true;
export const GEO_FENCE_RADIUS_METERS = 200;

// Attendance
export const MAX_CHECKIN_PER_SHIFT = 1;
export const AUTO_CHECKOUT_ENABLED = true;

// UI
export const GREETING = {
  male: 'Thầy',
  female: 'Cô',
} as const;

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  checked_in: 'Đã check-in',
  checked_out: 'Đã check-out',
  needs_review: 'Cần xác nhận',
};

export const SHIFT_TYPE_LABELS: Record<string, string> = {
  regular: 'Ca hành chính',
  extra: 'Ca ngoài giờ',
};

// Date/Time
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm:ss';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
