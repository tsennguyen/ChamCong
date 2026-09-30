import fs from 'fs';
import bcrypt from 'bcryptjs';

// Đọc env
const envContent = fs.readFileSync('.env.local', 'utf-8');
const envMap = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) envMap[m[1].trim()] = m[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const SUPABASE_URL = envMap.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envMap.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function api(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${txt}`);
  }
  return res.json();
}

async function main() {
  console.log('🚀 Bắt đầu tạo 20 user test và dữ liệu điểm danh thực tế...');

  // 1. Lấy danh sách ca làm việc
  const shifts = await api('shifts?select=*');
  const regularShift = shifts.find(s => s.type === 'regular' || s.name.includes('7:00')) || shifts[0];
  const extraShift = shifts.find(s => s.type === 'extra' || s.type === 'overtime' || s.name.includes('18:00')) || shifts[1] || shifts[0];

  console.log(`- Ca chính: ${regularShift.name} (${regularShift.id})`);
  console.log(`- Ca ngoài giờ: ${extraShift.name} (${extraShift.id})`);

  // 2. Hash mật khẩu: '1234' và 'test123'
  const hash1234 = await bcrypt.hash('1234', 10);
  const hashTest123 = await bcrypt.hash('test123', 10);

  // 3. Chuẩn bị 20 users
  const testUsersData = [];
  for (let i = 1; i <= 20; i++) {
    const isMale = (i === 17 || i === 18);
    const title = isMale ? 'Thầy' : 'Cô';
    const email = `test${i}@lumi.vn`;
    
    // User 19 để must_change_password = true để test luồng đổi pass lần đầu
    const mustChange = (i === 19);
    // User 19 hash pass test123, còn lại hash 1234
    const passHash = mustChange ? hashTest123 : hash1234;

    testUsersData.push({
      email,
      password_hash: passHash,
      full_name: `${title} Test ${i}`,
      gender: isMale ? 'male' : 'female',
      role: 'teacher',
      phone: `09000000${i < 10 ? '0' + i : i}`,
      is_active: true,
      must_change_password: mustChange,
    });
  }

  // Upsert users
  console.log('🌱 Đang lưu 20 tài khoản test...');
  const upsertedUsers = await api('users?on_conflict=email', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(testUsersData),
  });

  console.log(`✅ Đã tạo/cập nhật thành công ${upsertedUsers.length} tài khoản.`);

  // Sắp xếp theo email test1 -> test20
  upsertedUsers.sort((a, b) => {
    const numA = parseInt(a.email.replace(/\D/g, ''), 10);
    const numB = parseInt(b.email.replace(/\D/g, ''), 10);
    return numA - numB;
  });

  // 4. Phân công ca (shift_assignments)
  console.log('🌱 Phân công ca làm việc...');
  const assignments = [];
  const today = '2026-10-01';

  for (let i = 1; i <= 20; i++) {
    const user = upsertedUsers.find(u => u.email === `test${i}@lumi.vn`);
    if (!user) continue;

    const isExtraShift = (i === 10 || i === 11 || i === 12 || i === 18);
    const assignedShift = isExtraShift ? extraShift : regularShift;

    assignments.push({
      user_id: user.id,
      shift_id: assignedShift.id,
      effective_from: today,
      is_active: true,
    });
  }

  // Xóa assignment cũ của 20 user này và tạo mới
  const userIds = upsertedUsers.map(u => u.id);
  await fetch(`${SUPABASE_URL}/rest/v1/shift_assignments?user_id=in.(${userIds.join(',')})`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  await api('shift_assignments', {
    method: 'POST',
    body: JSON.stringify(assignments),
  });

  // 5. Xóa dữ liệu điểm danh hôm nay của 20 user này (để tạo mới sạch sẽ)
  console.log('🌱 Làm sạch dữ liệu điểm danh hôm nay của test users...');
  await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?user_id=in.(${userIds.join(',')})&attendance_date=eq.${today}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  // 6. Tạo các ca test điểm danh đa dạng hôm nay (01/10/2026)
  console.log('🌱 Tạo các bản ghi điểm danh với đầy đủ mọi case test...');
  const records = [];

  const getUser = (n) => upsertedUsers.find(u => u.email === `test${n}@lumi.vn`);

  // Case 1: Đúng giờ chuẩn (test1)
  records.push({
    user_id: getUser(1).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T06:55:00.000Z',
    check_out_time: '2026-10-01T17:00:00.000Z',
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ',
    check_out_note: 'Đúng giờ',
  });

  // Case 2: Ân hạn 1 phút (test2)
  records.push({
    user_id: getUser(2).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:01:00.000Z',
    check_out_time: '2026-10-01T17:05:00.000Z',
    late_minutes: 0,
    overtime_minutes: 5,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ (Ân hạn 1p)',
    check_out_note: 'Đúng giờ',
  });

  // Case 3: Đi trễ nhẹ 14 phút (test3)
  records.push({
    user_id: getUser(3).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:15:00.000Z',
    check_out_time: '2026-10-01T17:00:00.000Z',
    late_minutes: 14,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Trễ 14p',
    check_out_note: 'Trễ 14p',
  });

  // Case 4: Đi trễ 44 phút (test4)
  records.push({
    user_id: getUser(4).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:45:00.000Z',
    check_out_time: '2026-10-01T17:10:00.000Z',
    late_minutes: 44,
    overtime_minutes: 10,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Trễ 44p',
    check_out_note: 'Trễ 44p',
  });

  // Case 5: Tăng ca 60 phút = +40.000đ (test5)
  records.push({
    user_id: getUser(5).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:00:00.000Z',
    check_out_time: '2026-10-01T18:00:00.000Z',
    late_minutes: 0,
    overtime_minutes: 60,
    overtime_amount: 40000,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ',
    check_out_note: 'Tăng ca +60p',
  });

  // Case 6: Tăng ca 90 phút = +60.000đ (test6)
  records.push({
    user_id: getUser(6).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T06:50:00.000Z',
    check_out_time: '2026-10-01T18:30:00.000Z',
    late_minutes: 0,
    overtime_minutes: 90,
    overtime_amount: 60000,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ',
    check_out_note: 'Tăng ca +90p',
  });

  // Case 7: Vừa trễ 24p vừa tăng ca 60p = +40.000đ (test7)
  records.push({
    user_id: getUser(7).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:25:00.000Z',
    check_out_time: '2026-10-01T18:00:00.000Z',
    late_minutes: 24,
    overtime_minutes: 60,
    overtime_amount: 40000,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Trễ 24p',
    check_out_note: 'Trễ 24p • Tăng ca +60p',
  });

  // Case 8: KHÔNG ĐỦ GIỜ (20 phút) -> BÁO ĐỎ 0 CÔNG (test8)
  records.push({
    user_id: getUser(8).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:00:00.000Z',
    check_out_time: '2026-10-01T07:20:00.000Z',
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ',
    check_out_note: 'Không đủ giờ làm (20 phút) • Về sớm',
  });

  // Case 9: KHÔNG ĐỦ GIỜ (25 phút) -> BÁO ĐỎ 0 CÔNG (test9)
  records.push({
    user_id: getUser(9).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T08:00:00.000Z',
    check_out_time: '2026-10-01T08:25:00.000Z',
    late_minutes: 59,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Trễ 59p',
    check_out_note: 'Không đủ giờ làm (25 phút) • Đi trễ & về sớm',
  });

  // Case 10: Ca ngoài giờ đúng giờ (test10)
  records.push({
    user_id: getUser(10).id,
    shift_id: extraShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T17:55:00.000Z',
    check_out_time: '2026-10-01T19:30:00.000Z',
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'extra',
    check_in_note: 'Đúng giờ',
    check_out_note: 'Đúng giờ',
  });

  // Case 11: Ca ngoài giờ trễ 11p (test11)
  records.push({
    user_id: getUser(11).id,
    shift_id: extraShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T18:12:00.000Z',
    check_out_time: '2026-10-01T19:35:00.000Z',
    late_minutes: 11,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'extra',
    check_in_note: 'Trễ 11p',
    check_out_note: 'Trễ 11p',
  });

  // Case 12: Ca ngoài giờ KHÔNG ĐỦ GIỜ (20 phút) -> BÁO ĐỎ (test12)
  records.push({
    user_id: getUser(12).id,
    shift_id: extraShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T18:00:00.000Z',
    check_out_time: '2026-10-01T18:20:00.000Z',
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'extra',
    check_in_note: 'Đúng giờ',
    check_out_note: 'Không đủ giờ làm (20 phút) • Về sớm',
  });

  // Case 13: ĐANG TRONG CA - ĐÚNG GIỜ (test13)
  records.push({
    user_id: getUser(13).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:00:00.000Z',
    check_out_time: null,
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_in',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ',
    check_out_note: null,
  });

  // Case 14: ĐANG TRONG CA - TRỄ 34p (test14)
  records.push({
    user_id: getUser(14).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:35:00.000Z',
    check_out_time: null,
    late_minutes: 34,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out', // để test14 cũng xem checked_in
    status: 'checked_in',
    shift_type: 'regular',
    check_in_note: 'Trễ 34p',
    check_out_note: null,
  });

  // Case 15: Có kèm GHI CHÚ RIÊNG (test15)
  records.push({
    user_id: getUser(15).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T06:58:00.000Z',
    check_out_time: '2026-10-01T17:00:00.000Z',
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ • Đón bé sớm lớp Panda',
    check_out_note: 'Đúng giờ • Đã trả bé an toàn',
  });

  // Case 16: Trễ nhẹ 9p & Tăng ca 30p = +20.000đ (test16)
  records.push({
    user_id: getUser(16).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T07:10:00.000Z',
    check_out_time: '2026-10-01T17:30:00.000Z',
    late_minutes: 9,
    overtime_minutes: 30,
    overtime_amount: 20000,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Trễ 9p',
    check_out_note: 'Trễ 9p • Tăng ca +30p',
  });

  // Case 17: Thầy giáo thể chất (Nam) - Đúng giờ (test17)
  records.push({
    user_id: getUser(17).id,
    shift_id: regularShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T06:50:00.000Z',
    check_out_time: '2026-10-01T17:00:00.000Z',
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_out',
    shift_type: 'regular',
    check_in_note: 'Đúng giờ',
    check_out_note: 'Đúng giờ',
  });

  // Case 18: Thầy giáo ngoài giờ (Nam) - Đang trong ca (test18)
  records.push({
    user_id: getUser(18).id,
    shift_id: extraShift.id,
    attendance_date: today,
    check_in_time: '2026-10-01T18:00:00.000Z',
    check_out_time: null,
    late_minutes: 0,
    overtime_minutes: 0,
    overtime_amount: 0,
    status: 'checked_in',
    shift_type: 'extra',
    check_in_note: 'Đúng giờ',
    check_out_note: null,
  });

  // User 19: Chưa điểm danh (test luồng đổi mật khẩu)
  // User 20: Chưa điểm danh (test luồng tự bấm checkin trên app)

  await api('attendance_records', {
    method: 'POST',
    body: JSON.stringify(records),
  });

  console.log(`🎉 HOÀN TẤT! Đã tạo 20 user và ${records.length} bản ghi test điểm danh hôm nay.`);
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
