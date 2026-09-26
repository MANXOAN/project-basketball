# GoldenState Basketball Booking

Ứng dụng đặt sân bóng rổ gồm React/Vite frontend và Node.js/Express/MongoDB backend.

## Chạy local

Yêu cầu: Node.js 22+, npm và MongoDB đang chạy local.

Mở hai terminal:

```bash
# Terminal 1 — Backend (http://127.0.0.1:3000)
cd Backend
npm install
npm run seed   # Chỉ dùng khi muốn tạo lại dữ liệu local từ đầu
npm start
```

```bash
# Terminal 2 — Frontend (http://127.0.0.1:5173)
cd Frontend
npm install
npm run dev
```

Frontend dùng proxy `/api` sang `http://127.0.0.1:3000` mặc định. Nếu backend chạy cổng khác trên máy cá nhân, chạy frontend với biến môi trường tương ứng, ví dụ:

```bash
VITE_BACKEND_URL=http://127.0.0.1:3001 npm run dev
```

## Dữ liệu local

Dữ liệu seed chính nằm tại [`Frontend/db.json`](Frontend/db.json). File này gồm các cơ sở và sân bóng rổ đã được kiểm tra, bao gồm GoldenState Arena Quận 7 (`fieldId=101`) và các sân `1011`–`1013`.

> **Lưu ý:** `npm run seed` sẽ xoá và tạo lại users, fields, courts, bookings, vouchers và payments trong database được cấu hình. Chỉ chạy với MongoDB local hoặc database được phép làm mới.

`git pull` chỉ lấy source code và file seed. Nếu cần mang nguyên lịch sử booking/MongoDB hiện có từ một máy sang máy khác, hãy export/import MongoDB; không chạy seed trên database dùng chung đang có dữ liệu cần giữ.

## Thay đổi gần đây

- Danh sách cơ sở và sân chỉ lấy từ backend/database; đã bỏ dữ liệu sân demo fallback ở frontend.
- Luồng đặt sân chỉ cho chọn sân active thuộc đúng cơ sở. Lỗi API được hiển thị thay vì tự thay bằng dữ liệu mẫu.
- Bước thanh toán yêu cầu người dùng tự chọn một trong ba phương thức: cọc 30%, thanh toán 100%, hoặc tiền mặt tại sân. Không còn tự chọn VNPay.
- Tin tức tại `/blog` và khối tin ở trang chủ lấy từ API chính thức của VBA qua backend:
  `https://gw.vba.vn/api/vba/blogs`.
  Backend cache kết quả 10 phút; nếu VBA không phản hồi, API trả lỗi rõ ràng thay vì bài viết mẫu.
- Các trang quản trị lịch và đơn đặt sân cũng không còn fallback sang dữ liệu demo.
- Đặt lịch dài hạn hỗ trợ lặp hằng ngày hoặc hằng tuần trong khoảng ngày đã chọn; từng buổi vẫn là booking con độc lập để đổi lịch hoặc hủy riêng.

## Endpoint cần kiểm tra

Khi backend và frontend đang chạy, có thể kiểm tra qua proxy frontend:

```bash
curl http://127.0.0.1:5173/api/fields/101
curl "http://127.0.0.1:5173/api/courts?fieldId=101"
curl "http://127.0.0.1:5173/api/news?limit=1"
```

## Kiểm tra trước khi bàn giao

```bash
cd Frontend
npm run build
```

Build frontend cần hoàn tất không có lỗi TypeScript. Cảnh báo kích thước bundle hiện có không làm build thất bại.
