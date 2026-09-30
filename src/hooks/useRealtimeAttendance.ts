'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AttendanceRecord, ExtraSession } from '@/types';

interface TodayAttendance {
  regular: (AttendanceRecord & { user?: { full_name: string; gender: string } })[];
  extra: (ExtraSession & { user?: { full_name: string; gender: string } })[];
  loading: boolean;
  error: string | null;
}

export function useRealtimeAttendance(today: string) {
  const [data, setData] = useState<TodayAttendance>({
    regular: [],
    extra: [],
    loading: true,
    error: null,
  });

  const fetchTodayData = useCallback(async () => {
    const supabase = createClient();

    try {
      // Fetch regular attendance
      const { data: regularData, error: regularError } = await supabase
        .from('attendance_records')
        .select('*, user:users(full_name, gender), shift:shifts(name, start_time, end_time)')
        .eq('attendance_date', today)
        .order('check_in_time', { ascending: true });

      if (regularError) throw regularError;

      // Fetch extra sessions
      const { data: extraData, error: extraError } = await supabase
        .from('extra_sessions')
        .select('*, user:users(full_name, gender)')
        .eq('session_date', today)
        .order('planned_start', { ascending: true });

      if (extraError) throw extraError;

      setData({
        regular: regularData || [],
        extra: extraData || [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Lỗi tải dữ liệu',
      }));
    }
  }, [today]);

  useEffect(() => {
    fetchTodayData();

    // Subscribe to realtime changes
    const supabase = createClient();

    const attendanceChannel = supabase
      .channel('today-attendance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `attendance_date=eq.${today}`,
        },
        () => {
          // Refetch on any change
          fetchTodayData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'extra_sessions',
          filter: `session_date=eq.${today}`,
        },
        () => {
          fetchTodayData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
    };
  }, [today, fetchTodayData]);

  return data;
}
