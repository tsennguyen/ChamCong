import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  return NextResponse.json({ data: [] });
}

export async function POST(req: Request) {
  return NextResponse.json({ success: true });
}
