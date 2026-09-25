# Bàn giao cập nhật — 25/09/2026

## Cách lấy code

Branch chung hiện tại: `feat/booking-shared-db-flow`.

```bash
git checkout feat/booking-shared-db-flow
git pull origin feat/booking-shared-db-flow
```

Không commit file `.env`. Tạo file `Backend/.env` từ `Backend/.env.example` và điền thông số MongoDB, Gmail App Password, VNPay riêng của máy.

## Đã cập nhật local (cần commit/push để cả nhóm nhận được)

### Quản trị cơ sở và sân

- Thêm màn `/admin/facilities`: cơ sở hiển thị dạng card/grid; thêm, sửa, xóa cơ sở; xem và quản lý sân con theo từng cơ sở.
- Cơ sở có `rating`; sân con có trạng thái chuẩn `active`, `maintenance`, `inactive`.
- Chống trùng tên cơ sở, không phân biệt hoa/thường.
- Chống trùng tên sân con trong cùng cơ sở.
- Không cho xóa cơ sở/sân con khi còn booking trạng thái pending, confirmed hoặc completed.

### Mini CRM, voucher và nhân sự

- Thêm model/API `/customers` và màn Mini CRM: thêm, sửa, xóa khách hàng; không trùng số điện thoại.
- Voucher: bổ sung sửa và xóa ở admin; backend đã kiểm tra mã voucher trùng.
- Nhân viên: sửa thông tin, đổi role, khóa/mở khóa tài khoản; tài khoản bị khóa không đăng nhập được.

### Email thanh toán

- Gmail SMTP qua Nodemailer, cấu hình timeout kết nối.
- Khi VNPay callback thành công, email xác nhận thanh toán được gửi một lần cho từng payment.
- Nội dung email: mã check-in chữ, cơ sở, địa chỉ (với booking mới), sân, lịch, tổng tiền, đã thanh toán, còn lại, voucher và mã giao dịch.
- Đã test SMTP gửi thành công tới Gmail/FPT mail.

## Database mới nhất / cách chạy cho nhóm

- Không cần import dump DB mới chỉ để có các field `rating`, `isActive`, `fieldAddress` hoặc collection `customers`: MongoDB/Mongoose tự tạo collection và dùng default khi tạo dữ liệu mới.
- Seed đã được cập nhật để reset/seed luôn collection `customers` và counter tương ứng.
- Muốn dữ liệu mẫu sạch: chạy MongoDB local, cấu hình `MONGODB_URI` trong `Backend/.env`, rồi chạy `npm run seed` trong `Backend/`.
- **Chỉ dùng seed cho local/test.** Lệnh này xóa dữ liệu hiện có của các collection `users`, `fields`, `courts`, `bookings`, `vouchers`, `payments`, `customers` trước khi nạp dữ liệu mẫu. Không chạy trên DB có dữ liệu thật.
- File `Backend/db_datn_su26.archive.gz` là dump cũ, không dùng làm “DB mới nhất”. Nếu nhóm cần dùng chung dữ liệu thật, export dump mới riêng và không đưa secrets vào repo.

## Phần remote vừa pull (`68fccbd`)

- Cập nhật `Frontend/src/pages/Booking.tsx`.
- Cập nhật `Backend/.env.example`.
- Chỉnh format/comment trong `Backend/src/controllers/booking.js`.
- Cập nhật `Frontend/package-lock.json`.

## Checklist cần test

1. Đăng nhập bằng user/admin/manager; xác nhận manager mới thấy quản lý sân/cơ sở.
2. CRUD cơ sở và sân con; thử tên trùng.
3. Tạo booking pending/confirmed rồi thử xóa sân con/cơ sở, phải bị chặn.
4. CRUD khách hàng; thử số điện thoại trùng.
5. CRUD voucher; tạo/sửa mã trùng phải bị chặn.
6. Tạo/sửa/khóa nhân viên; thử đăng nhập tài khoản đã khóa.
7. Đặt sân, áp voucher, thanh toán sandbox VNPay; kiểm tra email và số tiền còn lại.
8. Chạy backend tests: `npm run test:rbac`, `npm run test:payment` trong `Backend/`.
9. Chạy frontend type-check: `npx tsc -b` trong `Frontend/`.

## Việc còn cần xử lý

- **Email:** QR đã được bỏ theo yêu cầu; email dùng mã check-in chữ `BK...` để lễ tân tra cứu.
- Booking controller local từng bổ sung `fieldAddress` đã bị ghi đè khi pull remote; cần quyết định bổ sung lại nếu muốn email lấy địa chỉ đã chốt tại thời điểm đặt.
- Node hiện tại là 16.20.2, trong khi Vite yêu cầu Node 20.19+; nâng Node trước khi chạy `npm run build` frontend.
- Các thay đổi local trong danh sách trên chưa commit/push. Cần review, commit theo nhóm chức năng rồi push branch chung/PR.
