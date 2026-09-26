# Note bàn giao - Đặt sân hàng tuần và trọn tháng

Cập nhật: 26/09/2026

## 1. Mục tiêu thay đổi

- Làm rõ ba kiểu lịch trên trang đặt sân:
  - `Một buổi`: chỉ đặt ngày và giờ đã chọn.
  - `Hàng tuần`: lặp cùng thứ, cùng giờ; giao diện tự gợi ý phạm vi 4 tuần và cho sửa ngày kết thúc.
  - `Trọn tháng`: lặp cùng thứ, cùng giờ trong 30 ngày kể từ ngày bắt đầu.
- Kiểm tra toàn bộ các buổi trước khi sang bước tiếp theo và kiểm tra lại ngay trước khi tạo đơn.
- Nếu một buổi bị trùng, hiển thị ngày/giờ bị kín, tối đa 6 giờ thay thế và cho phép bỏ riêng ngày đó.
- Tạo một Booking Group và một lần thanh toán cho toàn bộ các buổi còn lại.
- Hiển thị toàn bộ lịch ở Paygate, khi thanh toán lại/phần còn lại và trong chi tiết lịch sử đơn.

> `Trọn tháng` hiện không có nghĩa là đặt mỗi ngày trong 30 ngày. Đây là lịch cố định hàng tuần trong một chu kỳ 30 ngày. Nếu nghiệp vụ cần đặt mỗi ngày, phải chốt lại trước khi đổi vì số slot và tổng tiền sẽ khác đáng kể.

## 2. File đã thay đổi

### Backend

- `Backend/src/controllers/bookingAvailability.js`
  - API kiểm tra nhiều ngày cùng lúc và gợi ý giờ thay thế.
- `Backend/src/routes/booking.js`
  - Thêm `POST /api/bookings/check-availability`.
- `Backend/src/services/bookingPlan.js`
  - Nhận danh sách `occurrences` có ngày/giờ riêng; tối đa 60 buổi.
- `Backend/src/controllers/booking.js`
  - Dùng `occurrences` đã được khách xác nhận để tạo booking con và khóa slot.
- `Backend/src/tests/payment-flow.test.js`
  - Test ngày bị trùng, giờ gợi ý và group có các ngày dùng giờ khác nhau.

### Frontend

- `Frontend/src/pages/Booking.tsx`
  - Chọn kiểu lịch, kiểm tra toàn bộ lịch, đổi giờ/bỏ ngày trùng và tính lại số buổi/tổng tiền.
- `Frontend/src/pages/Paygate.tsx`
  - Hiển thị danh sách buổi thuộc lần thanh toán.
- `Frontend/src/pages/MyBookings.tsx`
  - Tải chi tiết group trước khi thanh toán lại hoặc thanh toán 70% còn lại.

## 3. API mới

```http
POST /api/bookings/check-availability
Authorization: Bearer <token>
Content-Type: application/json
```

Ví dụ body:

```json
{
  "courtId": 1011,
  "bookingMode": "court",
  "duration": 1,
  "occurrences": [
    { "date": "2026-10-10", "time": "19:00" },
    { "date": "2026-10-17", "time": "19:00" },
    { "date": "2026-10-24", "time": "19:00" }
  ]
}
```

Response khi có lịch trùng:

```json
{
  "available": false,
  "conflicts": [
    {
      "date": "2026-10-17",
      "time": "19:00",
      "suggestions": ["06:00", "06:30", "07:00"]
    }
  ]
}
```

Backend vẫn dùng unique index của `BookingSlot` làm lớp bảo vệ cuối nếu hai khách xác nhận đồng thời.

## 4. Cách pull và chạy

Yêu cầu Node.js 22; tối thiểu phải đáp ứng yêu cầu của Vite là Node.js 20.19+.

```bash
git pull

cd Backend
npm install
npm start
```

Mở terminal khác:

```bash
cd Frontend
npm install
npm run dev
```

Không chạy `npm run seed` trên database dùng chung hoặc database đang có dữ liệu cần giữ.

## 5. Checklist test thủ công

### Một buổi

1. Chọn `Một buổi`, sân, ngày, giờ và thời lượng.
2. Bấm `Kiểm tra toàn bộ lịch`.
3. Nếu trống, phải hiện `Tất cả buổi đang còn trống`.
4. Sang thanh toán và xác nhận chỉ có 1 buổi.

### Hàng tuần

1. Chọn ngày bắt đầu và một giờ còn trống.
2. Chọn `Hàng tuần`.
3. Kiểm tra ngày kết thúc được gợi ý và có thể sửa.
4. Danh sách phải lặp đúng cùng thứ/cùng giờ mỗi 7 ngày.
5. Tổng tiền phải bằng giá mỗi buổi nhân số buổi, cộng dịch vụ và trừ voucher.

### Trọn tháng

1. Chọn một ngày, ví dụ ngày 10, và giờ 19:00.
2. Chọn `Trọn tháng`.
3. Phạm vi phải là 30 ngày kể từ ngày bắt đầu.
4. Danh sách phải gồm cùng thứ/cùng giờ trong phạm vi đó.
5. Không được tạo quá 60 buổi.

### Có ngày bị trùng

1. Tạo trước một booking chiếm một ngày trong chuỗi.
2. Tạo lịch tuần/tháng có chứa ngày vừa đặt.
3. Bấm kiểm tra lịch hoặc bấm tiếp tục.
4. Form phải tập trung vào khối cảnh báo và liệt kê đúng ngày/giờ bị kín.
5. Chọn một giờ gợi ý; danh sách buổi và tổng tiền phải cập nhật nhưng số buổi giữ nguyên.
6. Thử `Bỏ ngày này`; ngày đó phải biến mất và tổng tiền phải giảm theo số buổi mới.
7. Kiểm tra lại toàn bộ lịch trước khi được sang bước tiếp theo.

### Thanh toán và lịch sử đơn

1. Sang Paygate và kiểm tra đủ ngày/giờ đã chọn hoặc đã thay thế.
2. Quay lại chỉnh sửa; lịch đã đổi/bỏ phải được khôi phục.
3. Hoàn tất thanh toán hoặc chọn tiền mặt.
4. Vào `Đơn của tôi` → `Xem chi tiết`.
5. `Lịch của toàn bộ đơn` phải có đúng số buổi, ngày, giờ, giá và trạng thái.
6. Với đơn đang chờ thanh toán hoặc đã cọc, bấm thanh toán lại/phần còn lại; Paygate phải tải đủ lịch group.

### Cạnh tranh đồng thời

1. Hai tài khoản cùng kiểm tra một chuỗi lịch đang trống.
2. Cho tài khoản A xác nhận trước.
3. Tài khoản B xác nhận sau phải nhận HTTP 409 và không được tạo group dở dang.

### Bao toàn bộ sân

1. Chọn `Bao toàn bộ sân` cùng lịch tuần/tháng.
2. Một ngày chỉ được xem là trống khi tất cả sân con đều trống đủ thời lượng.
3. Nếu một sân con bị chiếm, ngày đó phải xuất hiện trong danh sách xung đột.

## 6. Kiểm tra tự động

Đã chạy thành công trên máy hiện tại:

```bash
cd Backend
npm run test:payment
npm run test:rbac

cd ../Frontend
./node_modules/.bin/tsc -b
```

Kết quả:

- Backend payment/booking flow: pass.
- Backend RBAC: pass.
- Frontend TypeScript: pass.
- `git diff --check`: pass.

Cần chạy lại trên Node.js 22 sau khi pull:

```bash
cd Frontend
npm run lint
npm run build
```

Máy tạo note đang dùng Node.js 16.20.2 nên Vite dừng với yêu cầu Node 20.19+ và ESLint thiếu `structuredClone`. Đây là giới hạn runtime local, không phải lỗi TypeScript của thay đổi này.

## 7. Cập nhật tiếp theo

Các mục audit log, đổi buổi, phụ thu/hoàn chênh lệch và CRUD sân manager đã được triển khai ở đợt tiếp theo. Xem checklist đầy đủ tại `UPDATE_NOTE_2026-09-26.md`.
