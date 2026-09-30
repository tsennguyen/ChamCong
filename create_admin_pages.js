const fs = require('fs');
const path = require('path');

const files = {
  'src/app/(admin)/layout.tsx': `
'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Clock,
  Moon,
  BarChart,
  Smartphone,
  RefreshCw,
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Tổng quan', href: '/admin', icon: LayoutDashboard },
    { name: 'Chấm công', href: '/admin/attendance', icon: ClipboardList },
    { name: 'Giáo viên', href: '/admin/teachers', icon: Users },
    { name: 'Ca làm việc', href: '/admin/shifts', icon: Clock },
    { name: 'Ca ngoài giờ', href: '/admin/extra', icon: Moon },
    { name: 'Báo cáo', href: '/admin/reports', icon: BarChart },
    { name: 'Thiết bị', href: '/admin/devices', icon: Smartphone },
    { name: 'Google Sheets', href: '/admin/sync', icon: RefreshCw },
    { name: 'Cài đặt', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#1e6b3e] text-white p-4 flex justify-between items-center">
        <div className="font-bold text-xl flex items-center">
          <span>Lumi Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={\`bg-[#1e6b3e] text-white w-64 flex-shrink-0 flex-col \${sidebarOpen ? 'flex' : 'hidden'} md:flex absolute md:relative z-10 h-full min-h-screen\`}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-bold">Lumi Preschool</h1>
          <p className="text-sm opacity-80 mt-1">Admin Dashboard</p>
        </div>
        
        <nav className="flex-1 px-4 pb-4 overflow-y-auto mt-4 md:mt-0">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={\`flex items-center space-x-3 p-3 rounded-lg transition-colors \${isActive ? 'bg-[#2e8b57] text-white' : 'hover:bg-[#2e8b57]/50 text-white/90'}\`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-white/10 mt-auto">
          <div className="mb-4">
            <p className="text-sm font-medium">Xin chào,</p>
            <p className="font-bold truncate">{user?.full_name || 'Admin'}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center space-x-2 text-white/80 hover:text-white w-full p-2 rounded hover:bg-white/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm h-16 hidden md:flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(i => i.href === pathname)?.name || 'Dashboard'}
          </h2>
          <div className="flex items-center">
            <span className="text-gray-600 mr-4">Hi, {user?.gender === 'M' ? 'Thầy' : 'Cô'} {user?.full_name}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
`,

  'src/app/(admin)/admin/page.tsx': `
'use client';
import { useState, useEffect } from 'react';
import { Users, UserCheck, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalTeachers: 0,
    checkedIn: 0,
    late: 0,
    overtime: 0
  });
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Mock API calls for now
        const [teachersRes, attendanceRes] = await Promise.all([
          fetch('/api/teachers').then(res => res.json()),
          fetch('/api/attendance/today').then(res => res.json())
        ]);
        
        const lateCount = (attendanceRes.data || []).filter((a: any) => a.late_minutes > 0).length;
        const overtimeSum = (attendanceRes.data || []).reduce((sum: number, a: any) => sum + (a.overtime_minutes || 0), 0);
        
        setStats({
          totalTeachers: teachersRes.data?.length || 0,
          checkedIn: attendanceRes.data?.length || 0,
          late: lateCount,
          overtime: overtimeSum
        });
        setAttendance(attendanceRes.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const todayStr = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-gray-500 capitalize">{todayStr}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse h-32"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Tổng giáo viên" value={stats.totalTeachers} icon={Users} color="bg-blue-50 text-blue-600" />
          <StatCard title="Đã chấm công" value={stats.checkedIn} icon={UserCheck} color="bg-green-50 text-[#2e8b57]" />
          <StatCard title="Đi trễ hôm nay" value={stats.late} icon={Clock} color="bg-orange-50 text-orange-600" />
          <StatCard title="Tăng ca (phút)" value={stats.overtime} icon={DollarSign} color="bg-purple-50 text-purple-600" />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Hoạt động chấm công hôm nay</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Giáo viên</th>
                <th className="px-6 py-4 font-medium">Giờ vào</th>
                <th className="px-6 py-4 font-medium">Giờ ra</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Chưa có dữ liệu chấm công hôm nay</td>
                </tr>
              ) : (
                attendance.map((record: any) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{record.user?.full_name}</td>
                    <td className="px-6 py-4">{record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-'}</td>
                    <td className="px-6 py-4">{record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-'}</td>
                    <td className="px-6 py-4">
                      {record.status === 'present' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Đúng giờ</span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Đi trễ</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number | string, icon: any, color: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
      <div className={\`p-4 rounded-full \${color}\`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
`,

  'src/app/(admin)/admin/teachers/page.tsx': `
'use client';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      setTeachers(data.data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý giáo viên</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#2e8b57] hover:bg-[#1e6b3e] text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus size={18} className="mr-2" /> Thêm giáo viên
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">#</th>
                <th className="px-6 py-4 font-medium">Tên</th>
                <th className="px-6 py-4 font-medium">Giới tính</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">SĐT</th>
                <th className="px-6 py-4 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8">Đang tải...</td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8">Chưa có dữ liệu</td></tr>
              ) : (
                teachers.map((teacher: any, idx) => (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium">{teacher.full_name}</td>
                    <td className="px-6 py-4">{teacher.gender === 'M' ? 'Thầy' : 'Cô'}</td>
                    <td className="px-6 py-4">{teacher.email}</td>
                    <td className="px-6 py-4">{teacher.phone || '-'}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={18}/></button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Basic modal placeholder */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Thêm giáo viên</h2>
            <p className="text-gray-500 mb-4">Form implementation goes here</p>
            <div className="flex justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`,

  'src/app/(admin)/admin/shifts/page.tsx': `
'use client';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([]);
  
  useEffect(() => {
    fetch('/api/shifts').then(res => res.json()).then(data => setShifts(data.data || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý ca làm việc</h1>
        <button className="bg-[#2e8b57] hover:bg-[#1e6b3e] text-white px-4 py-2 rounded-lg flex items-center">
          <Plus size={18} className="mr-2" /> Thêm ca
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm">
            <tr>
              <th className="px-6 py-4 font-medium">Tên ca</th>
              <th className="px-6 py-4 font-medium">Loại</th>
              <th className="px-6 py-4 font-medium">Bắt đầu - Kết thúc</th>
              <th className="px-6 py-4 font-medium">Grace (phút)</th>
              <th className="px-6 py-4 font-medium">Tăng ca (đ/giờ)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shifts.map((shift: any) => (
              <tr key={shift.id}>
                <td className="px-6 py-4 font-medium">{shift.name}</td>
                <td className="px-6 py-4">{shift.type === 'regular' ? 'Hành chính' : 'Ngoài giờ'}</td>
                <td className="px-6 py-4">{shift.start_time} - {shift.end_time}</td>
                <td className="px-6 py-4">{shift.grace_minutes}</td>
                <td className="px-6 py-4">{shift.overtime_rate?.toLocaleString()} đ</td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`,

  'src/app/(admin)/admin/attendance/page.tsx': `
'use client';
import { useState, useEffect } from 'react';

export default function AdminAttendancePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Bảng chấm công</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center text-gray-500">
        Tính năng đang được phát triển...
      </div>
    </div>
  );
}
`,

  'src/app/api/teachers/route.ts': `
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  return NextResponse.json({ data: [] });
}

export async function POST(req: Request) {
  return NextResponse.json({ success: true });
}
`,

  'src/app/api/teachers/[id]/route.ts': `
import { NextResponse } from 'next/server';

export async function GET() { return NextResponse.json({}); }
export async function PUT() { return NextResponse.json({}); }
export async function DELETE() { return NextResponse.json({}); }
`,

  'src/app/api/shifts/route.ts': `
import { NextResponse } from 'next/server';

export async function GET() { return NextResponse.json({ data: [] }); }
export async function POST() { return NextResponse.json({ success: true }); }
`,

  'src/app/api/shifts/[id]/route.ts': `
import { NextResponse } from 'next/server';

export async function PUT() { return NextResponse.json({}); }
export async function DELETE() { return NextResponse.json({}); }
`,

  'src/app/api/shifts/assignments/route.ts': `
import { NextResponse } from 'next/server';

export async function GET() { return NextResponse.json({ data: [] }); }
export async function POST() { return NextResponse.json({ success: true }); }
export async function PUT() { return NextResponse.json({ success: true }); }
`
};

Object.entries(files).forEach(([filepath, content]) => {
  const fullPath = path.join('/Users/mybi/ChamCongLumi', filepath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('Created: ' + filepath);
});
