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
      <div className={`p-4 rounded-full ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
