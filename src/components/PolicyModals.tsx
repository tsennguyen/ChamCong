'use client';

import { useState } from 'react';
import { Shield, FileText, Cookie, PhoneCall, X } from 'lucide-react';

export type PolicyType = 'privacy' | 'attendance' | 'cookie' | 'support' | null;

interface PolicyModalsProps {
  activePolicy: PolicyType;
  onClose: () => void;
}

export function PolicyModals({ activePolicy, onClose }: PolicyModalsProps) {
  if (!activePolicy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            {activePolicy === 'privacy' && <Shield className="w-5 h-5 text-emerald-600" />}
            {activePolicy === 'attendance' && <FileText className="w-5 h-5 text-emerald-600" />}
            {activePolicy === 'cookie' && <Cookie className="w-5 h-5 text-emerald-600" />}
            {activePolicy === 'support' && <PhoneCall className="w-5 h-5 text-emerald-600" />}
            <h3 className="font-bold text-slate-900 text-base">
              {activePolicy === 'privacy' && 'Chính sách Bảo mật & Dữ liệu Nhân sự'}
              {activePolicy === 'attendance' && 'Quy định Chấm công & Tính giờ làm việc'}
              {activePolicy === 'cookie' && 'Chính sách Cookie & Phiên làm việc'}
              {activePolicy === 'support' && 'Hỗ trợ Kỹ thuật & Báo cáo Sự cố'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {activePolicy === 'privacy' && (
            <>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. Mục đích thu thập dữ liệu</h4>
                <p>
                  Hệ thống chỉ thu thập thông tin định danh nội bộ (Họ tên, email, chức danh) cùng dữ liệu điểm danh (thời gian check-in/check-out, địa chỉ IP kết nối, thông tin thiết bị) nhằm mục đích quản trị nhân sự và tính công minh bạch cho giáo viên Trường Mầm Non LUMI Preschool — Khai Minh.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Cam kết bảo mật</h4>
                <p>
                  Dữ liệu điểm danh và thông tin cá nhân của thầy cô được mã hóa bảo mật chuẩn công nghiệp, chỉ lưu trữ trên máy chủ an toàn và đồng bộ nội bộ sang Google Sheets của Ban Giám Hiệu. Nhà trường cam kết tuyệt đối không chia sẻ, thương mại hóa hay cung cấp thông tin cho bất kỳ bên thứ ba nào khác.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">3. Quyền của giáo viên</h4>
                <p>
                  Giáo viên có quyền tra cứu lịch sử chấm công cá nhân, yêu cầu xác nhận điều chỉnh khi có sự cố kỹ thuật và chủ động thay đổi mật khẩu tài khoản bất cứ lúc nào.
                </p>
              </div>
            </>
          )}

          {activePolicy === 'attendance' && (
            <>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. Thời gian làm việc chuẩn</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Ca chính (Hành chính)</strong>: Từ 07:00 đến 17:00 (hoặc 07:30 đến 17:30 theo phân công).</li>
                  <li><strong>Ca ngoài giờ (Trông muộn)</strong>: Từ 18:00 đến 19:30 (hoặc 18:00 đến 20:30).</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Quy định đi trễ & Ân hạn</h4>
                <p>
                  Hệ thống áp dụng thời gian ân hạn <strong>01 phút</strong> so với giờ bắt đầu ca làm việc. Check-in sau thời gian ân hạn sẽ được tự động ghi nhận số phút trễ chính xác vào hệ thống và phiếu báo cáo.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">3. Quy định Tăng ca</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Ca chính</strong>: Làm việc quá giờ tan ca được tính tăng ca với mức thù lao quy định là <strong>40.000đ/giờ</strong>.</li>
                  <li><strong>Ca ngoài giờ</strong>: Đã được chi trả theo chế độ khoán ca riêng, <strong>không áp dụng tính phụ cấp tăng ca (0đ)</strong>.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">4. Quy định ca hợp lệ (Tính công)</h4>
                <p>
                  Thời gian làm việc tối thiểu của một ca phải đạt từ <strong>30 phút trở lên</strong>. Các lượt check-in rồi check-out tức thì dưới 30 phút sẽ được đánh dấu <em>&quot;Không đủ giờ làm&quot;</em> và <strong>không được tính công (0 công)</strong>.
                </p>
              </div>
            </>
          )}

          {activePolicy === 'cookie' && (
            <>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. Sử dụng Cookie & Session</h4>
                <p>
                  Website sử dụng cookie phiên làm việc thiết yếu (NextAuth Session Cookie) để duy trì trạng thái đăng nhập an toàn của giáo viên trên thiết bị di động hoặc máy tính cá nhân.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Không theo dõi quảng cáo</h4>
                <p>
                  Hệ thống không sử dụng cookie theo dõi của bên thứ ba, không chứa quảng cáo hay mã theo dõi hành vi người dùng ngoài phạm vi ứng dụng.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-1">3. Đăng xuất an toàn</h4>
                <p>
                  Khi giáo viên bấm nút <strong>&quot;Thoát&quot;</strong>, toàn bộ cookie phiên đăng nhập sẽ được xóa sạch khỏi trình duyệt để bảo vệ tài khoản cá nhân.
                </p>
              </div>
            </>
          )}

          {activePolicy === 'support' && (
            <>
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                <h4 className="font-bold text-emerald-900 mb-1">Kênh tiếp nhận sự cố chấm công</h4>
                <p className="text-emerald-800 text-xs">
                  Nếu cô gặp sự cố: Quên điện thoại, hết pin, thiết bị không kết nối được WiFi trường hoặc quên bấm check-out, vui lòng thông báo ngay cho Quản lý cơ sở để được hỗ trợ ghi nhận thủ công.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">Quản lý cơ sở / Ban Giám Hiệu</div>
                    <div className="text-xs text-slate-500">Cô Nguyễn Thị My</div>
                  </div>
                  <span className="font-bold text-emerald-700 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                    my@lumi.vn
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-800">Bộ phận Kỹ thuật &amp; Vận hành</div>
                    <div className="text-xs text-slate-500">Nguyễn Việt Thành</div>
                  </div>
                  <a
                    href="mailto:vietthanhnguyen.tsen@gmail.com"
                    className="font-bold text-emerald-700 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50"
                  >
                    vietthanhnguyen.tsen@gmail.com
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Đã hiểu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
