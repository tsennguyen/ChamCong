import { GREETING } from '@/config/constants';
import type { Gender } from '@/types';

/**
 * Tạo lời chào theo giới tính
 * Nữ → "Cô", Nam → "Thầy"
 */
export function getGreeting(gender: Gender, fullName: string): string {
  const title = GREETING[gender];
  // Extract first name (last word in Vietnamese full name)
  const firstName = fullName.trim().split(' ').pop() || fullName;
  return `Chào ${title} ${firstName}!`;
}

/**
 * Lấy xưng hô theo giới tính
 */
export function getTitle(gender: Gender): string {
  return GREETING[gender];
}
