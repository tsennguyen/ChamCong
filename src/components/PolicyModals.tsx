'use client';

import { X } from 'lucide-react';

export type PolicyType = 'privacy' | 'attendance' | 'cookie' | 'support' | null;

interface PolicyModalsProps {
  activePolicy: PolicyType;
  onClose: () => void;
  lang?: 'vi' | 'en';
}

export function PolicyModals({ activePolicy, onClose, lang = 'vi' }: PolicyModalsProps) {
  if (!activePolicy) return null;

  const isEn = lang === 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header - No icons */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <h3 className="font-bold text-slate-900 text-base">
            {isEn ? (
              <>
                {activePolicy === 'privacy' && 'Privacy & Data Protection Policy'}
                {activePolicy === 'attendance' && 'Attendance & Working Hours Regulations'}
                {activePolicy === 'cookie' && 'Cookie & Session Policy'}
                {activePolicy === 'support' && 'Technical Support & Incident Reporting'}
              </>
            ) : (
              <>
                {activePolicy === 'privacy' && 'Chính sách Bảo mật & Dữ liệu'}
                {activePolicy === 'attendance' && 'Quy định Chấm công & Giờ làm việc'}
                {activePolicy === 'cookie' && 'Chính sách Cookie & Phiên làm việc'}
                {activePolicy === 'support' && 'Báo cáo Sự cố & Hỗ trợ Kỹ thuật'}
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {activePolicy === 'privacy' && (
            isEn ? (
              <>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">1. Purpose of Data Collection</h4>
                  <p>
                    The system only collects internal identity information (Full name, email, job title) along with attendance data (check-in/check-out timestamps, network IP address, device fingerprints) for personnel administration and transparent work record management for LUMI Preschool — Khai Minh Kindergarten teachers.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">2. Confidentiality Commitment</h4>
                  <p>
                    Attendance records and teachers&apos; personal data are securely encrypted, stored strictly on secure servers and internally synchronized to LUMI Preschool&apos;s Google Sheets. The school strictly commits not to sell, monetize, or provide user information to any third parties.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">3. Teacher Rights &amp; Security</h4>
                  <p>
                    Teachers have the right to view personal attendance history and request reviews if technical issues arise. Regarding account credentials, teachers do not independently change passwords whenever they choose, but should contact the Administrator (Admin) when encountering issues; password updates are strictly required upon first login.
                  </p>
                </div>
              </>
            ) : (
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
                    Dữ liệu điểm danh và thông tin cá nhân của thầy cô được mã hóa bảo mật chuẩn công nghiệp, chỉ lưu trữ trên máy chủ an toàn và đồng bộ nội bộ sang Google Sheets của Trường Mầm Non LUMI. Nhà trường cam kết tuyệt đối không chia sẻ, thương mại hóa hay cung cấp thông tin cho bất kỳ bên thứ ba nào khác.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">3. Quyền của giáo viên</h4>
                  <p>
                    Giáo viên có quyền tra cứu lịch sử chấm công cá nhân và yêu cầu xác nhận điều chỉnh khi có sự cố kỹ thuật. Về bảo mật tài khoản, giáo viên không có quyền thay đổi mật khẩu chủ động bất cứ lúc nào mà liên hệ Quản trị viên (Admin) nếu gặp sự cố; hệ thống chỉ yêu cầu đổi mật khẩu ở lần đầu đăng nhập.
                  </p>
                </div>
              </>
            )
          )}

          {activePolicy === 'attendance' && (
            isEn ? (
              <>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">1. Standard Working Hours</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Main Shift</strong>: From 07:00 to 17:00 (or according to shift assignment).</li>
                    <li><strong>Overtime Shift</strong>: From 18:00 to 19:30 (or 18:00 to 20:30).</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">2. Punctuality &amp; Grace Period</h4>
                  <p>
                    The system applies a <strong>01-minute grace period</strong> from the scheduled start time. Clocking in after this grace period will automatically record the exact late minutes into system records and reports.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">3. Overtime Policy</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Main Shift</strong>: Working past scheduled departure time qualifies for overtime compensation at <strong>40,000 VND/hour</strong>.</li>
                    <li><strong>Overtime Shift</strong>: Paid according to a fixed package rate, <strong>additional overtime allowance does not apply</strong>.</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">1. Thời gian làm việc chuẩn</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Ca chính</strong>: Từ 07:00 đến 17:00 (hoặc theo phân công ca).</li>
                    <li><strong>Ca ngoài giờ</strong>: Từ 18:00 đến 19:30 (hoặc 18:00 đến 20:30).</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">2. Quy định đi trễ &amp; Ân hạn</h4>
                  <p>
                    Hệ thống áp dụng thời gian ân hạn <strong>01 phút</strong> so với giờ bắt đầu ca làm việc. Check-in sau thời gian ân hạn sẽ được tự động ghi nhận số phút trễ chính xác vào hệ thống và phiếu báo cáo.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">3. Quy định Tăng ca</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Ca chính</strong>: Làm việc quá giờ tan ca được tính tăng ca với mức thù lao quy định là <strong>40.000đ/giờ</strong>.</li>
                    <li><strong>Ca ngoài giờ</strong>: Đã được chi trả theo chế độ khoán ca riêng, <strong>không áp dụng tính phụ cấp tăng ca</strong>.</li>
                  </ul>
                </div>
              </>
            )
          )}

          {activePolicy === 'cookie' && (
            isEn ? (
              <>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">1. Essential Cookie &amp; Session Usage</h4>
                  <p>
                    The website utilizes essential session cookies (NextAuth Session Cookie) strictly to preserve secure teacher login state across mobile and desktop devices.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">2. Zero Advertising Tracking</h4>
                  <p>
                    The system does not use third-party tracking cookies, contains no advertisements, and runs no behavioral tracking scripts outside the app.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">3. Secure Logout</h4>
                  <p>
                    When teachers click <strong>&quot;Log out&quot;</strong>, session cookies are immediately erased from the browser to safeguard account security.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">1. Sử dụng Cookie &amp; Session</h4>
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
            )
          )}

          {activePolicy === 'support' && (
            isEn ? (
              <>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <h4 className="font-bold text-emerald-900 mb-1">Attendance Incident Reporting Channel</h4>
                  <p className="text-emerald-800 text-xs">
                    If you forget your phone, run out of battery, cannot connect to school WiFi, or forgot to clock out, please notify the Campus Manager or Technical Team promptly for manual adjustment.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">Campus Manager</div>
                      <div className="text-xs text-slate-600 font-medium">Phan Van</div>
                    </div>
                    <span className="font-semibold text-emerald-800 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      Lumi Preschool Campus
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">System Technical Engineer</div>
                      <div className="text-xs text-slate-600 font-medium">Nguyen Viet Thanh</div>
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
            ) : (
              <>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <h4 className="font-bold text-emerald-900 mb-1">Kênh tiếp nhận sự cố chấm công</h4>
                  <p className="text-emerald-800 text-xs">
                    Nếu cô gặp sự cố: Quên điện thoại, hết pin, thiết bị không kết nối được WiFi trường hoặc quên bấm check-out, vui lòng thông báo ngay cho Quản lý cơ sở hoặc Kỹ thuật viên để được hỗ trợ xử lý kịp thời.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">Quản lý cơ sở</div>
                      <div className="text-xs text-slate-600 font-medium">Phan Vân</div>
                    </div>
                    <span className="font-semibold text-emerald-800 text-xs bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      Cơ sở Lumi Preschool
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">Kỹ thuật viên hệ thống</div>
                      <div className="text-xs text-slate-600 font-medium">Nguyễn Việt Thành</div>
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
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {isEn ? 'Understood & Close' : 'Đã hiểu & Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}
