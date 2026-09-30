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
