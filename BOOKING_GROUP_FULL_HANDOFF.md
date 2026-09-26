# Bàn giao: Booking Group, đổi/hủy từng buổi và quản lý sân

Cập nhật: 26/09/2026

## Phạm vi đã làm

### Đặt dài hạn

- Có ba lựa chọn: một buổi, hàng tuần và trọn tháng.
- “Trọn tháng” là cùng thứ/cùng giờ lặp mỗi 7 ngày trong cửa sổ 30 ngày, không phải đặt mỗi ngày.
- Kiểm tra toàn bộ occurrence trước khi tiếp tục và trước khi tạo đơn.
- Ngày bị trùng hiển thị giờ thay thế; khách có thể đổi giờ riêng hoặc bỏ ngày đó.
- Database giữ unique index `courtId + date + time`, nên hai khách không thể chiếm cùng một slot.

### Booking Group và child booking

- Một group chứa nhiều child, thanh toán một lần trên group.
- Mỗi child có giá, lịch, trạng thái, hoàn tiền và history riêng.
- Hủy một child không hủy các child còn lại.
- Group chỉ chuyển `cancelled` khi không còn child hoạt động.
- Chi tiết đơn và Paygate hiển thị toàn bộ lịch của group.

### Đổi một child

- Chỉ chủ đơn, manager hoặc admin được thao tác.
- Chặn child đã qua, đang diễn ra, đã hủy hoặc hoàn tất.
- Kiểm tra lại cơ sở, sân, giờ hoạt động và slot mới.
- Nếu slot mới bằng giá: đổi ngay.
- Nếu rẻ hơn: đổi lịch, nhả slot cũ và tạo yêu cầu hoàn phần chênh lệch.
- Nếu đắt hơn và đơn đã trả tiền: tạo `BookingAdjustment`; lịch cũ giữ nguyên. Sau khi VNPay phụ thu thành công mới chuyển slot.
- Nếu thanh toán phụ thu thành công nhưng slot vừa bị người khác lấy hoặc giá thay đổi: lịch cũ vẫn giữ, payment chuyển `refund_pending`.
- Thao tác đổi slot có compensation rollback: nếu insert/update lỗi, slot mới được dọn và slot cũ được khôi phục.

### Audit history

Collection mới `bookinghistories` là append-only ở tầng ứng dụng, ghi các loại:

- `create`
- `update`
- `cancel`
- `reschedule`
- `refund`
- `payment`

Chi tiết child hiển thị timeline, thời gian, lý do và chênh lệch tiền.

### Quản lý cơ sở và sân con

- Chỉ role `manager` đi qua middleware CRUD `/fields` và `/courts`.
- `admin`, `user`, guest không có quyền sửa.
- Validate tên, giá, status, field cha và whitelist field được cập nhật.
- Không xóa cơ sở/sân con nếu còn booking `pending` hoặc `confirmed`.
- Booking `completed` là lịch sử, không giữ cho sân khỏi bị xóa.
- UI quản lý hiện có tại `/admin/facilities` và `/admin/courts`, route và nút chỉ hiện cho manager.

## API group

Tất cả endpoint có cả prefix root và `/api`.

```http
POST   /api/booking-groups
GET    /api/booking-groups/:id
PATCH  /api/booking-groups/:id/children/:childId
POST   /api/booking-groups/:id/children/:childId/cancel
GET    /api/booking-groups/:id/history
POST   /api/booking-groups/:id/adjust-payment
```

Ví dụ đổi một child:

```json
{
  "newFieldId": 10,
  "newCourtId": 11,
  "newDate": "2030-05-01",
  "newTime": "18:30",
  "newDuration": 1.5,
  "reason": "Đổi lịch thi đấu"
}
```

Response có một trong các `status`:

- `applied`: đã đổi, không phát sinh phụ thu.
- `refund_pending`: đã đổi và chờ hoàn chênh lệch.
- `requires_payment`: chưa đổi; frontend dùng `adjustment.id` và `paymentDelta` để mở VNPay.
- `failed`: không đổi, lịch cũ được giữ nguyên.

`POST /adjust-payment` dùng để đọc trạng thái adjustment; action `confirm` chỉ dành cho manager/admin xác nhận khoản thu thủ công. Khách thanh toán online phải qua VNPay để không thể tự giả mạo đã trả tiền.

## Dữ liệu mới/thay đổi

- Collection mới: `bookinghistories`.
- Collection mới: `bookingadjustments`.
- `bookings`: thêm `cancelledAt`, `pendingAdjustmentId`.
- `bookinggroups`: thêm `createdBy`, `paymentMethod`, `discountAmount`, `refundAmount`.
- `payments`: thêm payment kind `adjustment` và `adjustmentId`.
- `courts`: thêm `description`, `imageUrl`; bổ sung min cho capacity.
- `fields`: enum status và min cho `priceFrom`.

Mongoose tự tạo field/collection khi ứng dụng ghi dữ liệu; không có script migration phá dữ liệu cũ. Booking cũ không có history sẽ chỉ bắt đầu có timeline từ lần thay đổi mới.

## Chuẩn bị database trước khi test

Không cần thêm field hoặc tạo collection thủ công. Khi backend chạy và có dữ liệu mới, Mongoose sẽ tự tạo `bookinghistories`, `bookingadjustments` và các field mới. Không có migration bắt buộc và không cần backfill booking cũ.

Trước khi test trên database dùng chung:

1. Sao lưu database.
2. Kiểm tra `MONGODB_URI` đang trỏ đúng môi trường test, không trỏ production.
3. Không chạy `npm run seed` trên database dùng chung vì seed có thể thay thế dữ liệu mẫu.
4. Khởi động backend một lần để Mongoose đăng ký model/index.
5. Kiểm tra unique index của slot bằng `mongosh`:

```javascript
use db_datn_su26
db.bookingslots.getIndexes()
```

Index quan trọng phải là unique trên ba field:

```javascript
{ courtId: 1, date: 1, time: 1 }
```

Nếu môi trường triển khai tắt tự tạo index, kiểm tra dữ liệu trùng trước:

```javascript
db.bookingslots.aggregate([
  {
    $group: {
      _id: { courtId: "$courtId", date: "$date", time: "$time" },
      count: { $sum: 1 }
    }
  },
  { $match: { count: { $gt: 1 } } }
])
```

Chỉ khi kết quả rỗng mới tạo index thủ công:

```javascript
db.bookingslots.createIndex(
  { courtId: 1, date: 1, time: 1 },
  { unique: true, name: "courtId_1_date_1_time_1" }
)
```

Không tự xóa các slot trùng nếu truy vấn trả về dữ liệu; cần đối chiếu booking và payment trước. Các test tự động dùng MongoDB in-memory nên không sửa database thật.

## Hướng dẫn để mọi người pull và test

### 1. Chuẩn bị môi trường

```bash
git pull
node -v

cd Backend
npm install

cd ../Frontend
npm install
```

Dùng Node.js 22. Chuẩn bị file `.env` backend theo cấu hình dự án, tối thiểu phải có kết nối MongoDB và JWT. Muốn test thanh toán/phụ thu online phải có thêm cấu hình VNPay; nếu chưa có VNPay sandbox vẫn test được luồng đặt, kiểm tra trùng, đổi ngang giá, đổi rẻ hơn, hủy và history.

### 2. Tài khoản test cần có

- Hai tài khoản `user` khác nhau để kiểm tra tranh chấp slot và phân quyền chủ đơn.
- Một tài khoản `manager` để tạo/sửa/xóa cơ sở, sân con và xác nhận phụ thu thủ công.
- Một tài khoản `admin` để kiểm tra hoàn tiền và xác nhận rằng admin không được CRUD cơ sở/sân con theo rule hiện tại.

### 3. Thứ tự test tay đề xuất

1. Manager tạo một cơ sở và ít nhất hai sân có mức giá khác nhau.
2. User A đặt một buổi, hàng tuần và trọn tháng; kiểm tra danh sách ngày trước khi thanh toán.
3. User B chọn một slot User A đã giữ; hệ thống phải báo trùng và cho chọn giờ khác/bỏ ngày.
4. User A thanh toán group rồi mở “Đơn của tôi → Xem chi tiết”; kiểm tra đủ các child và timeline.
5. Hủy một child ở giữa; các child còn lại không bị hủy.
6. Đổi một child sang lịch ngang giá; lịch đổi ngay.
7. Đổi sang sân đắt hơn; lịch cũ phải giữ nguyên đến khi phụ thu thành công.
8. Đổi sang sân rẻ hơn; lịch đổi và phần chênh lệch chuyển `refund_pending`.
9. Dùng User B chiếm slot mới trong lúc User A chờ phụ thu; khi callback về, lịch cũ của User A vẫn phải còn và payment phụ thu chuyển `refund_pending`.
10. Dùng user khác sửa/hủy đơn của User A; API phải từ chối.
11. Manager thử xóa sân/cơ sở còn booking `pending` hoặc `confirmed`; API phải trả 409.
12. Kiểm tra lịch sử có đủ create, payment, reschedule, cancel và refund theo các thao tác trên.

## Checklist QA bắt buộc

1. Tạo group 3 child và thanh toán đúng một giao dịch group.
2. Hủy child thứ hai; child 1 và 3 cùng slot của chúng vẫn còn.
3. Đổi child sang sân/thời lượng đắt hơn; trước thanh toán lịch cũ còn nguyên.
4. Hoàn tất VNPay phụ thu; slot cũ được nhả, slot mới được giữ.
5. Đổi sang lịch rẻ hơn; thấy `refund_pending` đúng số chênh lệch.
6. Đổi child đang diễn ra/đã qua; nhận 409 và dữ liệu không đổi.
7. Dùng tài khoản khác đặt trước slot mới trong lúc chờ; callback phụ thu phải đưa tiền vào `refund_pending`, lịch cũ còn nguyên.
8. Xem timeline child có create/payment/reschedule/cancel/refund tương ứng.
9. Hai tài khoản đặt cùng slot; tài khoản thứ hai nhận 409.
10. User/admin gọi POST/PATCH/DELETE fields/courts nhận 403; manager thao tác được.
11. Xóa sân/cơ sở có booking pending/confirmed nhận 409.
12. Paygate và “Đơn của tôi → Xem chi tiết” hiển thị đủ child trong group.

## Lệnh test

Yêu cầu Node.js 22 theo README.

```bash
cd Backend
npm run test:payment
npm run test:rbac
npm run test:venues

cd ../Frontend
./node_modules/.bin/tsc -b
npm run lint
npm run build
```

Trên máy triển khai hiện tại:

- `test:payment`: pass.
- `test:rbac`: pass.
- `test:venues`: pass.
- TypeScript `tsc -b`: pass.
- Frontend production build: pass bằng Node 22.23.1.
- Lint riêng toàn bộ file của tính năng: pass với `--max-warnings 0`.
- Lint toàn repository còn fail do 21 lỗi `no-explicit-any`/unused variable có sẵn ở AdminCustomers, AdminEmployees, AdminVouchers, ForgotPassword, Login, Profile và ResetPassword; không thuộc luồng booking này.
