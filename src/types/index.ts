// Database row types matching Supabase schema

export type Gender = 'male' | 'female';
export type UserRole = 'admin' | 'teacher';
export type ShiftType = 'regular' | 'extra';
export type AttendanceStatus = 'checked_in' | 'checked_out' | 'needs_review';
export type SyncDirection = 'web_to_sheet' | 'sheet_to_web';
export type DeviceAction = 'check_in' | 'check_out' | 'login';

export interface User {
  id: string;
  email: string;
  full_name: string;
  gender: Gender;
  role: UserRole;
  phone: string | null;
  start_date: string | null;
  is_active: boolean;
  must_change_password: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  name: string;
  type: ShiftType;
  start_time: string; // HH:mm format
  end_time: string;
  grace_minutes: number;
  overtime_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface ShiftAssignment {
  id: string;
  user_id: string;
  shift_id: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  created_at: string;
  // Joined
  shift?: Shift;
  user?: User;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  shift_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  late_minutes: number;
  overtime_minutes: number;
  overtime_amount: number;
  check_in_ip: string | null;
  check_out_ip: string | null;
  check_in_device: string | null;
  check_out_device: string | null;
  check_in_note: string | null;
  check_out_note: string | null;
  status: AttendanceStatus;
  shift_type: ShiftType;
  is_synced: boolean;
  created_at: string;
  // Joined
  user?: User;
  shift?: Shift;
}

export interface ExtraSession {
  id: string;
  user_id: string;
  session_date: string;
  planned_start: string;
  planned_end: string;
  actual_check_in: string | null;
  actual_check_out: string | null;
  total_minutes: number;
  note: string | null;
  is_synced: boolean;
  created_at: string;
  // Joined
  user?: User;
}

export interface DeviceLog {
  id: string;
  user_id: string;
  fingerprint: string | null;
  user_agent: string | null;
  ip_address: string | null;
  action: DeviceAction;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  ip_address: string | null;
  device_fingerprint: string | null;
  metadata: Record<string, unknown> | null;
  is_success: boolean;
  failure_reason: string | null;
  created_at: string;
  // Joined
  user?: User;
}

export interface SyncLog {
  id: string;
  direction: SyncDirection;
  sheet_tab: string | null;
  records_count: number;
  is_success: boolean;
  error_message: string | null;
  synced_at: string;
}

export interface AppConfig {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

// API request/response types

export interface CheckinRequest {
  shift_id: string;
  note?: string;
  device_fingerprint?: string;
}

export interface CheckoutRequest {
  attendance_id: string;
  note?: string;
  device_fingerprint?: string;
}

export interface CheckinResponse {
  success: boolean;
  message: string;
  data?: {
    attendance: AttendanceRecord;
    greeting: string;
    late_minutes: number;
    shift_type: ShiftType;
    shift_name: string;
  };
  error?: string;
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  data?: {
    attendance: AttendanceRecord;
    greeting: string;
    overtime_minutes: number;
    overtime_amount: number;
  };
  error?: string;
}

export interface CreateTeacherRequest {
  email: string;
  full_name: string;
  gender: Gender;
  phone?: string;
  start_date?: string;
  shift_id?: string; // assign shift on creation
}

export interface CreateShiftRequest {
  name: string;
  type: ShiftType;
  start_time: string;
  end_time: string;
  grace_minutes?: number;
  overtime_rate?: number;
}

export interface MonthlyReportRow {
  user: User;
  total_days: number;
  total_late_minutes: number;
  total_overtime_minutes: number;
  total_overtime_amount: number;
  total_extra_hours: number;
  attendance_rate: number; // percentage
}

export interface TodayStats {
  regular: AttendanceRecord[];
  extra: ExtraSession[];
  total_checked_in: number;
  total_teachers: number;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}
