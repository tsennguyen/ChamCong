# Hệ thống chấm công giáo viên Trường Mầm Non Lumi Preschool

![Lumi Preschool Logo](public/logolumi.jpg)

## Mô tả dự án
Hệ thống quản lý chấm công dành riêng cho giáo viên tại Trường Mầm Non Lumi Preschool. Hỗ trợ check-in/out nhanh chóng, chống gian lận qua WiFi/IP, xem thống kê theo thời gian thực và đồng bộ dữ liệu hai chiều với Google Sheets.

## Công nghệ sử dụng
| Công nghệ | Phiên bản / Chi tiết |
|-----------|----------------------|
| Framework | Next.js 14 (App Router) |
| Ngôn ngữ  | TypeScript |
| Giao diện | Tailwind CSS + shadcn/ui |
| Database  | Supabase PostgreSQL |
| Realtime  | Supabase Realtime |
| Xác thực  | NextAuth.js v5 |

## Tính năng chính
- **Check-in/out**: Nhanh chóng qua web với xác minh vị trí/thiết bị (QR/WiFi).
- **Chống gian lận**: Yêu cầu kết nối đúng mạng WiFi hoặc dải IP của trường.
- **Thống kê Realtime**: Theo dõi trạng thái đi làm ngay lập tức qua biểu đồ, dashboard.
- **Đồng bộ Google Sheets**: Tự động và thủ công đồng bộ hai chiều với file Excel của kế toán.
- **Quản lý Ca linh hoạt**: (CRUD shifts) Hỗ trợ nhiều loại ca linh hoạt (7:00-17:00, 7:30-17:30...).
- **Tính toán làm thêm giờ**: Tự động tính tiền tăng ca (40.000 VNĐ/giờ) sau khi hết ca, và thời gian trễ (cho phép trễ 1 phút).
- **Lớp học thêm**: Chấm công thời gian dạy ngoài giờ không tính tăng ca, chỉ theo dõi thời gian.
- **Chào mừng cá nhân hóa**: Lời chào thân thiện phân biệt Cô / Thầy dựa theo giới tính.

## Yêu cầu hệ thống
- Node.js 18+
- pnpm (khuyến nghị) hoặc npm/yarn
- Tài khoản Supabase (đã tạo project)

## Cài đặt & Chạy dự án

1. **Clone repository:**
   ```bash
   git clone <repository_url>
   cd ChamCongLumi
   ```

2. **Cài đặt thư viện:**
   ```bash
   pnpm install
   ```

3. **Cấu hình môi trường:**
   Copy file `.env.local.example` thành `.env.local` và điền đầy đủ các thông tin:
   ```bash
   cp .env.local.example .env.local
   ```

4. **Khởi chạy ứng dụng:**
   ```bash
   pnpm dev
   ```
   Mở trình duyệt và truy cập `http://localhost:3000`.

## Cấu trúc thư mục (Overview)
- `/app`: Các route của Next.js (App Router).
- `/components`: Chứa các component dùng chung (UI, Layout).
- `/lib`: Các hàm tiện ích, cấu hình database.
- `/public`: Chứa tài nguyên tĩnh (hình ảnh, fonts, logo).
- `/supabase`: Cấu hình và migrations cho Supabase.

## Biến môi trường
| Biến môi trường | Ý nghĩa |
|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL của Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key của Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Key admin của Supabase |
| `NEXTAUTH_SECRET` | Secret key cho NextAuth |
| `NEXTAUTH_URL` | URL gốc của ứng dụng (VD: http://localhost:3000) |
| `GOOGLE_SHEETS_ID` | ID của Google Sheet lưu dữ liệu |
| `GOOGLE_APPS_SCRIPT_URL` | URL của Google Apps Script (Webhook) |
| `NEXT_PUBLIC_APP_NAME` | Tên ứng dụng hiển thị |
| `NEXT_PUBLIC_SCHOOL_WIFI_SSID` | SSID của WiFi trường học dùng để check-in |
| `SCHOOL_IP_RANGE` | Dải IP được phép check-in |

## Bản quyền
Dự án được phân phối dưới giấy phép MIT. Xem chi tiết trong file `LICENSE`.
