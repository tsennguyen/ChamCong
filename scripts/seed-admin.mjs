/**
 * Seed script: Tạo admin account mặc định
 * Chạy: node scripts/seed-admin.mjs
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { WebSocket } from 'ws';

// Polyfill WebSocket for Node.js < 22
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY');
  console.error('Chạy: source .env.local && node scripts/seed-admin.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🌱 Seeding database...\n');

  // 1. Tạo admin account
  const adminPassword = 'Lumi@Preschool2026';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const { data: admin, error: adminErr } = await supabase
    .from('users')
    .upsert({
      email: 'admin@lumi.edu.vn',
      password_hash: hashedPassword,
      full_name: 'Admin Lumi',
      gender: 'female',
      role: 'admin',
      phone: '0901234567',
      is_active: true,
      must_change_password: false,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (adminErr) {
    console.error('❌ Lỗi tạo admin:', adminErr.message);
  } else {
    console.log('✅ Admin account:');
    console.log(`   Email: admin@lumi.edu.vn`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ID: ${admin.id}\n`);
  }

  // 2. Tạo ca mặc định
  const shifts = [
    { name: 'Ca 7:00-17:00', type: 'regular', start_time: '07:00', end_time: '17:00', grace_minutes: 1, overtime_rate: 40000 },
    { name: 'Ca 7:30-17:30', type: 'regular', start_time: '07:30', end_time: '17:30', grace_minutes: 1, overtime_rate: 40000 },
  ];

  for (const shift of shifts) {
    const { data, error } = await supabase
      .from('shifts')
      .upsert(shift, { onConflict: 'name' })
      .select()
      .single();

    if (error) {
      console.error(`❌ Lỗi tạo ca ${shift.name}:`, error.message);
    } else {
      console.log(`✅ Ca: ${shift.name} (ID: ${data.id})`);
    }
  }

  // 3. Tạo app config
  const configs = [
    { key: 'wifi_ssid', value: 'Lumi-WiFi', description: 'Tên WiFi trường' },
    { key: 'school_ip_range', value: '*', description: 'IP range (* = tất cả)' },
    { key: 'overtime_rate', value: '40000', description: 'Tiền tăng ca (VNĐ/giờ)' },
  ];

  for (const cfg of configs) {
    const { error } = await supabase
      .from('app_config')
      .upsert(cfg, { onConflict: 'key' });

    if (error) {
      console.error(`❌ Config ${cfg.key}:`, error.message);
    } else {
      console.log(`✅ Config: ${cfg.key} = ${cfg.value}`);
    }
  }

  // 4. Tạo 3 giáo viên mẫu
  const teachers = [
    { email: 'hanh@lumi.edu.vn', full_name: 'Nguyễn Thị Hạnh', gender: 'female', phone: '0911111111' },
    { email: 'mai@lumi.edu.vn', full_name: 'Trần Thị Mai', gender: 'female', phone: '0922222222' },
    { email: 'tuan@lumi.edu.vn', full_name: 'Lê Văn Tuấn', gender: 'male', phone: '0933333333' },
  ];

  const teacherPassword = 'teacher123';
  const teacherHash = await bcrypt.hash(teacherPassword, 12);

  for (const t of teachers) {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        ...t,
        password_hash: teacherHash,
        role: 'teacher',
        is_active: true,
        must_change_password: true,
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      console.error(`❌ GV ${t.full_name}:`, error.message);
    } else {
      console.log(`✅ GV: ${t.full_name} (${t.email}) — MK: ${teacherPassword}`);

      // Gán ca 7:00-17:00
      const { data: shift } = await supabase
        .from('shifts')
        .select('id')
        .eq('name', 'Ca 7:00-17:00')
        .single();

      if (shift) {
        await supabase.from('shift_assignments').upsert({
          user_id: data.id,
          shift_id: shift.id,
          effective_from: '2026-01-01',
          is_active: true,
        }, { onConflict: 'user_id,shift_id,effective_from' });
      }
    }
  }

  console.log('\n🎉 Seed hoàn tất!');
  console.log('\n📋 Tài khoản test:');
  console.log('   Admin: admin@lumi.edu.vn / admin123');
  console.log('   GV:    hanh@lumi.edu.vn / teacher123');
  console.log('   GV:    mai@lumi.edu.vn / teacher123');
  console.log('   GV:    tuan@lumi.edu.vn / teacher123');
}

seed().catch(console.error);
