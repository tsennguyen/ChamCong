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
