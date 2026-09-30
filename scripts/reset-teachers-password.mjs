import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { WebSocket } from 'ws';

if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = WebSocket;
}

const env = fs.readFileSync('.env.local', 'utf-8');
const envVars = Object.fromEntries(
  env.split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const hash = await bcrypt.hash('hellolumi123', 12);
  const emails = ['my@lumi.vn', 'chinh@lumi.vn', 'nhung@lumi.vn', 'thuong@lumi.vn', 'tu@lumi.vn', 'trang@lumi.vn'];
  
  for (const email of emails) {
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: hash, must_change_password: true })
      .eq('email', email)
      .select('email, full_name, role, must_change_password');
    
    if (error) console.error('❌ Error updating', email, error.message);
    else console.log('✅ Updated:', email, data);
  }
}

run();
