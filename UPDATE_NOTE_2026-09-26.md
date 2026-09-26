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

## Chi tiết thay đổi theo module

### Backend

- `controllers/bookingAvailability.js`: thêm API kiểm tra nhiều ngày/giờ trong một request, phát hiện từng occurrence bị trùng và trả danh sách giờ thay thế.
- `services/bookingPlan.js`: hỗ trợ danh sách `occurrences` rõ ràng do khách đã xác nhận, thay vì chỉ suy ra một dải ngày.
- `controllers/booking.js`: tạo booking group và child, ghi history, hủy đúng một child, đồng bộ trạng thái group, xử lý payment/refund và trả thêm schedule/history trong chi tiết đơn.
- `controllers/bookingGroup.js` và `services/bookingGroupService.js`: đọc group, đổi lịch một child, hủy một child, tính chênh lệch tiền, giữ lịch cũ khi chờ phụ thu, rollback khi cập nhật lỗi và kiểm soát quyền chủ đơn.
- `routes/bookingGroup.js`: đăng ký các endpoint group dưới cả root và `/api`.
- `routes/vnpay.js` và `services/vnpayPayment.js`: thêm payment kind `adjustment`; số tiền phụ thu lấy từ DB, callback hợp lệ mới áp dụng lịch mới.
- `controllers/field.js` và `controllers/court.js`: validate payload, whitelist field cập nhật, kiểm tra field cha và chặn xóa khi còn booking hoạt động.
- Các model booking, group, payment, field và court được bổ sung field/trạng thái phục vụ group, hoàn tiền, phụ thu và quản lý sân.
- Thêm model `BookingHistory` và `BookingAdjustment`.

### Frontend

- `pages/Booking.tsx`: thêm lựa chọn một buổi/hàng tuần/trọn tháng, xem trước tất cả ngày, kiểm tra toàn bộ lịch, hiển thị ngày trùng, chọn giờ gợi ý hoặc bỏ riêng ngày.
- `pages/Paygate.tsx`: hiển thị đầy đủ các buổi trong group trước khi thanh toán.
- `pages/MyBookings.tsx`: hiển thị group/child, hủy riêng buổi, mở form đổi lịch, xử lý phụ thu và hiển thị timeline lịch sử.
- `components/BookingRescheduleModal.tsx`: modal đổi cơ sở, sân, ngày, giờ, thời lượng và lý do.
- `pages/Admin/AdminBookings.tsx`: nhận biết yêu cầu hoàn chênh lệch do đổi lịch.
- `pages/Admin/Facilities.tsx` và `pages/Admin/Courts.tsx`: bổ sung form mô tả, ảnh, validate và trạng thái sân.
- `lib/api.ts`: bổ sung type cho group, adjustment, history và các field mới.

### Test đã thêm hoặc mở rộng

- `payment-flow.test.js`: thanh toán group, hủy một child, đổi lịch bằng/đắt/rẻ hơn, phụ thu, hoàn chênh lệch, rollback, tranh chấp slot trong lúc chờ và history.
- `venue-management.test.js`: tạo/sửa/xóa cơ sở và sân, validate field cha, chặn xóa khi có booking hoạt động.
- `rbac.test.js`: xác nhận middleware phân quyền user/manager/admin.

## Luồng FE - BE - DB cần hiểu khi test

1. Frontend tạo danh sách occurrence theo kiểu lịch khách chọn.
2. Frontend gọi `POST /api/bookings/check-availability` để kiểm tra toàn bộ danh sách.
3. Nếu có ngày trùng, backend trả đúng ngày/giờ bị trùng và giờ gợi ý; frontend cho đổi riêng hoặc bỏ riêng ngày đó.
4. Khi xác nhận, backend kiểm tra lại lần cuối để tránh hai người cùng đặt trong khoảng thời gian giữa kiểm tra và bấm thanh toán.
5. Backend tạo một booking group, các child booking và các BookingSlot tương ứng.
6. Thanh toán group thành công cập nhật group/child và ghi lịch sử payment.
7. Hủy một child chỉ nhả slot của child đó; group còn hoạt động nếu vẫn còn child khác.
8. Đổi ngang giá áp dụng ngay. Đổi rẻ hơn áp dụng và tạo hoàn chênh lệch. Đổi đắt hơn giữ lịch cũ, tạo adjustment và chỉ áp dụng sau callback thanh toán hợp lệ.
9. Nếu slot mới bị lấy trong lúc khách đang thanh toán phụ thu, backend không làm mất lịch cũ; khoản phụ thu chuyển chờ hoàn.
10. Mọi thao tác create/update/cancel/reschedule/payment/refund được ghi vào timeline của child.

## Ma trận quyền cần test

| Thao tác | Chủ đơn | User khác | Manager | Admin |
| --- | --- | --- | --- | --- |
| Xem group/child của đơn | Có | Không | Có | Có |
| Đổi hoặc hủy child | Có | Không | Có | Có |
| Xác nhận phụ thu thủ công | Không | Không | Có | Có |
| CRUD cơ sở/sân con | Không | Không | Có | Không |
| Xem danh sách yêu cầu hoàn | Không | Không | Có | Có |
| Hoàn tiền booking | Không | Không | Không | Có |

Guest không được gọi endpoint booking group hoặc endpoint booking cần đăng nhập.

## Danh sách test lại chi tiết

Đánh dấu từng dòng sau khi test tay trên môi trường chung.

### A. Tạo lịch và kiểm tra trùng

- [ ] A01 — Một buổi: chọn một ngày/giờ, tổng số buổi phải là 1 và tổng tiền đúng.
- [ ] A02 — Hàng tuần: các occurrence phải cách nhau 7 ngày, cùng giờ, không vượt ngày kết thúc.
- [ ] A03 — Trọn tháng: hệ thống tạo cùng thứ/cùng giờ trong cửa sổ 30 ngày; không tạo booking cho mọi ngày trong tháng.
- [ ] A04 — Đổi ngày bắt đầu: preview lịch và tổng tiền cập nhật theo.
- [ ] A05 — Đổi thời lượng: giờ kết thúc và tổng tiền cập nhật; không được vượt giờ đóng cửa.
- [ ] A06 — Có một ngày bị trùng: chỉ ngày đó hiện cảnh báo.
- [ ] A07 — Chọn giờ gợi ý: occurrence tương ứng đổi giờ, các ngày khác giữ nguyên.
- [ ] A08 — Bỏ ngày trùng: ngày đó biến mất khỏi preview và tổng tiền giảm đúng.
- [ ] A09 — Tất cả ngày trống: cho qua bước thông tin khách.
- [ ] A10 — Hai user cùng xác nhận một slot gần như đồng thời: chỉ một đơn giữ được slot, đơn còn lại nhận 409/cảnh báo.
- [ ] A11 — Ngày hoặc giờ đã qua: frontend chặn; gọi trực tiếp API cũng phải bị backend từ chối.
- [ ] A12 — Danh sách rỗng, occurrence sai định dạng hoặc quá giới hạn: API từ chối và không tạo dữ liệu dở dang.

### B. Booking group và thanh toán

- [ ] B01 — Group ba buổi tạo đúng một group, ba child và đúng số BookingSlot.
- [ ] B02 — Tổng group bằng tổng child cộng dịch vụ trừ giảm giá.
- [ ] B03 — Paygate hiển thị đủ ngày, sân, giờ và số tiền của group.
- [ ] B04 — Thanh toán full thành công cập nhật payment/group/child và history.
- [ ] B05 — Thanh toán cọc cập nhật đúng paidAmount/paymentStatus hiện hành.
- [ ] B06 — Tiền mặt giữ đúng trạng thái theo luồng cũ.
- [ ] B07 — Callback VNPay lặp lại không được cộng tiền hoặc áp dụng adjustment hai lần.
- [ ] B08 — Callback sai chữ ký hoặc sai số tiền không được xác nhận đơn.
- [ ] B09 — Đơn pending hết hạn nhả slot đúng, không nhả slot của đơn khác.
- [ ] B10 — Voucher chỉ được hoàn trả khi toàn bộ group bị hủy theo rule hiện tại.

### C. Hủy và đổi từng buổi

- [ ] C01 — Hủy child ở giữa: chỉ child đó cancelled, hai child còn lại giữ nguyên.
- [ ] C02 — Slot của child đã hủy có thể được user khác đặt lại.
- [ ] C03 — Hủy child đã qua/đang diễn ra/đã hoàn tất bị từ chối.
- [ ] C04 — Hủy child cuối cùng làm group chuyển cancelled.
- [ ] C05 — Đổi cùng mức giá: lịch mới áp dụng ngay, slot cũ nhả và history có reschedule.
- [ ] C06 — Đổi sang mức giá thấp hơn: lịch mới áp dụng, đúng số chênh lệch ở refund_pending.
- [ ] C07 — Đổi sang mức giá cao hơn: lịch cũ vẫn còn trước khi trả phụ thu.
- [ ] C08 — Phụ thu thành công: slot mới được giữ, slot cũ được nhả, adjustment chuyển applied.
- [ ] C09 — Phụ thu thất bại/hủy: lịch cũ không thay đổi.
- [ ] C10 — Slot mới bị người khác lấy khi chờ phụ thu: lịch cũ còn, adjustment failed và payment phụ thu refund_pending.
- [ ] C11 — Giá sân thay đổi trong lúc chờ phụ thu: không tự áp dụng theo giá cũ; lịch cũ phải an toàn.
- [ ] C12 — Đổi sang sân inactive/maintenance, field không tồn tại hoặc ngoài giờ hoạt động bị từ chối.
- [ ] C13 — Tạo yêu cầu đổi mới khi child đang có refund pending bị từ chối.
- [ ] C14 — User khác gọi API đổi/hủy child của chủ đơn nhận 403.
- [ ] C15 — Lỗi giữa chừng khi đổi slot không để lại slot mới rác và phải khôi phục slot cũ.

### D. Lịch sử và chi tiết đơn

- [ ] D01 — “Đơn của tôi” nhóm đúng các child cùng group.
- [ ] D02 — Chi tiết group hiển thị đủ lịch, trạng thái và tiền của từng child.
- [ ] D03 — Timeline sắp theo thời gian và có create/payment/reschedule/cancel/refund tương ứng.
- [ ] D04 — Timeline ghi người thao tác, nguồn user/admin/manager/system, lý do và chênh lệch tiền.
- [ ] D05 — Booking cũ chưa có history vẫn mở chi tiết được và không làm trang lỗi.
- [ ] D06 — API chi tiết không trả `rawData` nhạy cảm của payment.

### E. Quản lý cơ sở và sân con

- [ ] E01 — Manager tạo/sửa cơ sở với tên, địa chỉ, giá, ảnh và trạng thái hợp lệ.
- [ ] E02 — Manager tạo/sửa sân con với field cha, giá, sức chứa, mô tả, ảnh và trạng thái.
- [ ] E03 — Tạo sân với field cha không tồn tại nhận 404.
- [ ] E04 — Giá âm, capacity nhỏ hơn 1 hoặc status ngoài enum bị từ chối.
- [ ] E05 — Payload cố sửa `id` hoặc field không được whitelist không làm đổi dữ liệu bảo vệ.
- [ ] E06 — User/admin/guest CRUD field hoặc court nhận 401/403; manager thao tác được.
- [ ] E07 — Xóa sân có booking pending/confirmed nhận 409.
- [ ] E08 — Xóa cơ sở có bất kỳ sân con đang có booking pending/confirmed nhận 409.
- [ ] E09 — Booking completed không chặn xóa theo rule hiện tại.
- [ ] E10 — Danh sách field/court và form quản lý tải đúng loading, empty và error state.

### F. Database và regression

- [ ] F01 — Có unique index BookingSlot trên `courtId + date + time`.
- [ ] F02 — Có document `bookinghistories` sau create/payment/đổi/hủy.
- [ ] F03 — Có document `bookingadjustments` khi đổi sang lịch đắt hơn.
- [ ] F04 — Không có child/slot mồ côi sau request lỗi.
- [ ] F05 — Booking cũ không có các field mới vẫn đọc được nhờ default/optional.
- [ ] F06 — Luồng đặt một buổi cũ vẫn hoạt động.
- [ ] F07 — Trang lịch, check-in, danh sách refund và admin booking cũ vẫn mở được.
- [ ] F08 — Voucher, dịch vụ đi kèm và cách tính cọc/full/cash không bị sai sau khi thêm group.
- [ ] F09 — Refresh trực tiếp các trang booking/paygate/my-bookings không trắng trang.
- [ ] F10 — Kiểm tra desktop và mobile: modal đổi lịch, bảng lịch, cảnh báo trùng và nút thao tác không tràn/không bị che.
- [ ] F11 — Kiểm tra keyboard: tab tới nút chọn kiểu lịch, giờ thay thế, bỏ ngày và nút submit; focus chuyển tới cảnh báo trùng.
- [ ] F12 — Log backend không có unhandled rejection khi callback/payment/reschedule lỗi.

## Kết quả đã xác nhận và phần nhóm vẫn phải test

Đã xác nhận tự động trên Node.js 22.23.1:

- Backend payment/booking flow: pass.
- Backend RBAC: pass.
- Backend venue management: pass.
- MongoDB in-memory cho các test Backend: pass.
- TypeScript Frontend: pass.
- Frontend production build: pass.
- Lint toàn bộ file thuộc tính năng này: pass với zero warning.

Nhóm vẫn phải test tay các mục A–F trên môi trường dùng chung, đặc biệt VNPay sandbox, responsive/mobile, nhiều trình duyệt và tình huống hai người thao tác đồng thời. Repository chưa có bộ E2E browser nên không được coi toàn bộ UI đã pass chỉ dựa trên build/type-check.

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
