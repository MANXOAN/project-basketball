# Checklist QA - Booking, Payment, Voucher, Refund và Ticket

Cập nhật: 24/09/2026
Branch: `feat/booking-shared-db-flow`
Mốc code cần QA: `7cd8ec3`

## 1. Chuẩn bị môi trường

- Chạy Backend tại `http://localhost:3000`.
- Chạy Frontend tại `http://localhost:5173`.
- Dùng chung một Backend và MongoDB khi test nhiều máy.
- Dùng Node.js 22.
- Không bật `ALLOW_IN_MEMORY_DB=true` khi cần giữ dữ liệu sau restart.
- Copy `Backend/.env.example` thành `Backend/.env` và điền cấu hình local.
- `Backend/.env` không còn được Git theo dõi. Thành viên tuyệt đối không commit secret.

## 2. Tài khoản và phân quyền

### User

- Có thể xem sân, đặt sân, thanh toán, xem lịch sử, xem/in vé và hủy đơn của chính mình.
- Không xem được toàn bộ voucher, danh sách hoàn tiền hoặc màn quản trị.
- Không thể xem, sửa hoặc hủy booking của tài khoản khác bằng cách đổi ID API.

### Manager

- Có thể đặt sân như user.
- Có thể xem lịch, danh sách đơn, quét QR, check-in và hủy vì chủ sân/bảo trì.
- Là vai trò duy nhất được thêm, sửa hoặc xóa cơ sở/sân con.
- Không được tạo voucher hoặc quản lý phân quyền tài khoản.

### Admin

- Có thể đặt sân như user.
- Có thể xem lịch, đơn, QR, hàng chờ hoàn tiền và xác nhận hoàn tất.
- Có thể tạo voucher và quản lý tài khoản/phân quyền.
- Không được thêm hoặc sửa sân; chức năng này thuộc Manager.

## 3. Chọn ngày và khung giờ

### Case giờ đã qua

1. Mở trang chi tiết một cơ sở và chọn ngày hôm nay.
2. Nếu hiện tại là 15:00, thử các mốc 13:00, 14:30 và 15:00.
3. Các mốc đã qua phải tối màu, disabled và không điều hướng sang Booking.
4. Mốc tương lai gần nhất, ví dụ 15:30, vẫn chọn được nếu chưa có người đặt.
5. Thử truyền URL chứa ngày quá khứ; trang chi tiết phải tự đưa về ngày hôm nay.
6. Thử truyền trực tiếp `date` và `time` cũ vào trang Booking; không được chuyển bước hoặc tạo đơn.
7. Gọi API tạo booking với giờ cũ; backend trả HTTP 400 và thông báo khung giờ đã qua.

Quy tắc dùng múi giờ Việt Nam UTC+7 và cập nhật giao diện mỗi 30 giây. Quy tắc áp dụng cho đơn thường, định kỳ, nhiều giai đoạn và bao sân.

### Case trùng lịch

1. Hai user cùng chọn một sân, ngày và giờ.
2. User A tạo đơn trước.
3. User B phải thấy slot bị khóa; nếu gửi đồng thời thì request đến sau nhận lỗi conflict.
4. Một ca 16:00-18:00 phải khóa đủ các mốc 16:00, 16:30, 17:00 và 17:30.

## 4. Đặt lịch định kỳ và nhiều giai đoạn

1. Chọn ngày đầu, ngày kết thúc và giờ cố định theo tuần.
2. Kiểm tra danh sách occurrence, tổng số buổi và tổng tiền.
3. Bấm `Thêm giai đoạn`, chọn ngày kế tiếp hoặc tháng kế tiếp và đổi giờ.
4. Lịch tổng phải gồm đầy đủ các giai đoạn, tối đa 60 buổi.
5. Nếu bất kỳ occurrence nào đã qua hoặc trùng lịch thì toàn bộ request bị từ chối.
6. Quay lại từ Paygate phải khôi phục ngày, giờ, giai đoạn, thông tin khách và dịch vụ đã nhập.

## 5. Bao toàn bộ sân

Dùng cơ sở `Sân Bóng Rổ GoldenState 2`, có 3 sân con.

1. Chọn `Bao toàn bộ sân`.
2. Chọn một khung giờ.
3. Cùng khung giờ đó phải được khóa trên cả 3 sân con.
4. Tổng tiền bằng tổng giá của 3 sân nhân thời lượng và số buổi.
5. Booking hiển thị nhãn bao sân và danh sách sân con.
6. Chi tiết lịch sử đơn phải hiển thị toàn bộ nhóm lịch và toàn bộ sân con.
7. Hủy nhóm chưa thanh toán phải nhả slot trên cả 3 sân.

## 6. Paygate và hết hạn thanh toán

1. Booking được tạo trước khi sang Paygate với trạng thái `pending/unpaid`.
2. Slot được giữ tối đa 15 phút.
3. Bấm quay lại chỉnh sửa phải hiện xác nhận hủy đơn giữ chỗ.
4. Xác nhận quay lại phải hủy toàn bộ nhóm giữ chỗ, nhả slot và khôi phục form.
5. Không xác nhận thì vẫn ở Paygate và giữ nguyên đơn.
6. Quá 15 phút, đơn tự hủy và slot trống trở lại.
7. Đơn hết hạn không tự thêm lại vào giỏ hàng.
8. Callback VNPay lặp lại không được cộng tiền hai lần.
9. Khoản thanh toán dư hoặc đến sau khi đơn hết hạn phải vào hàng chờ hoàn tiền.

## 7. Voucher

### Admin tạo voucher

1. Tạo mã `TEST10`, loại phần trăm, giảm 10%, giới hạn 2 lượt và thời gian gồm hôm nay.
2. Mã được chuẩn hóa thành chữ hoa.
3. Không cho tạo mã trùng khác hoa/thường.
4. Phần trăm chỉ nhận từ 1 đến 100.
5. Test thêm voucher số tiền cố định, inactive, chưa đến ngày và hết hạn.

### User áp dụng voucher

1. Nhập `test10` và bấm `Áp dụng`.
2. Chỉ sau khi backend xác nhận mới hiện dòng giảm giá và đổi tổng tiền.
3. Xóa hoặc sửa nội dung ô mã: giảm giá biến mất ngay, tổng tiền trở lại ban đầu và payload không gửi voucher.
4. Thay lịch, thời lượng hoặc dịch vụ làm đổi subtotal: voucher cũ không còn hiệu lực cho đến khi áp dụng lại.
5. Backend phải tự tính giảm giá, không tin `total/discount` do client gửi.
6. Hủy đơn chưa thanh toán hoặc để đơn hết hạn phải trả lại lượt voucher đúng một lần.
7. Voucher 100% xác nhận đơn ngay, tổng 0 và không chuyển sang Paygate.
8. User gọi GET danh sách voucher phải bị từ chối; Admin vẫn xem được.

## 8. Email sau thanh toán

Sau thanh toán thành công, kiểm tra Gmail nhận email gồm:

- Mã booking.
- Cơ sở, sân, ngày và giờ đầu tiên.
- Toàn bộ lịch nếu là booking nhóm.
- Số buổi, dịch vụ, voucher.
- Số tiền giao dịch, tổng đã trả và tổng đơn.
- Mã giao dịch và thông tin khách.

Cần test thực tế sau khi thay Gmail App Password mới trong `Backend/.env`. Không dùng mật khẩu Gmail thông thường.

## 9. Vé, QR và tra cứu in lại

### Khách hàng

1. Vào `Đơn của tôi`, mở vé của đơn hợp lệ.
2. Vé phải có mã booking, khách, SĐT, cơ sở, sân, ngày, giờ, tiền và trạng thái thanh toán.
3. QR phải render ngay trong ứng dụng, không phụ thuộc dịch vụ ảnh ngoài.
4. Có thể in/lưu PDF và thêm lịch.

### Admin/Manager

1. Tìm đơn theo mã BK, SĐT hoặc tên khách.
2. Bấm `Xem / In vé` để hỗ trợ khách mất vé.
3. Quét QR phải mở thông tin vé để đối chiếu, không tự check-in ngay.
4. Chỉ sau khi bấm `Xác nhận thông tin đúng & Check-in` đơn mới hoàn thành.
5. QR của đơn đã hủy không được check-in.

## 10. Hủy sân và hoàn tiền

### Khách hủy

- Trước giờ sân từ 2 tiếng trở lên: hoàn 100% số tiền đã trả.
- Còn dưới 2 tiếng nhưng chưa đến giờ: hoàn 50%.
- Đến hoặc quá giờ: hoàn 0%.
- Đơn chưa thanh toán: hủy ngay, không yêu cầu ngân hàng/STK.
- Đơn có tiền hoàn: bắt buộc nhập ngân hàng và STK.
- Sau khi hủy, trạng thái cập nhật ngay, không cần F5.

### Chủ sân hoặc bảo trì

1. Manager/Admin chọn `Hủy do sân`.
2. Chọn `Chủ sân hủy lịch` hoặc `Bảo trì đột xuất`.
3. Khách được hoàn 100% số tiền đã trả.
4. Slot được nhả ngay.

### Admin xử lý hoàn

1. Hàng chờ hiển thị số yêu cầu và tổng cần hoàn.
2. Popup hiển thị khách, số tiền, cổng thanh toán, ngân hàng, mã giao dịch, mã thanh toán và số tiền giao dịch gốc.
3. Case khách tự hủy hiển thị ngân hàng và STK khách cung cấp.
4. Case tiền mặt hiển thị phương thức và SĐT để liên hệ.
5. Sau khi Admin thực hiện hoàn thủ công, bấm xác nhận hoàn tất.
6. Hoàn 50% phải có trạng thái `partially_refunded`; hoàn đủ là `refunded`.
7. Khách nhận notification và trang `Đơn của tôi` tự cập nhật trong tối đa 10 giây, không cần F5.

Hoàn tiền tự động qua API VNPay không nằm trong phạm vi hiện tại.

## 11. Đồng bộ danh sách và thứ tự

- Đơn mới nhất phải nằm đầu danh sách Admin và `Đơn của tôi`.
- Admin tự tải lại khi quay lại tab và tối đa mỗi 10 giây.
- Khách hủy nhóm phải cập nhật tất cả booking trong nhóm ngay, không cần F5.
- Khi Admin xác nhận hoàn, khách nhận toast và trạng thái mới mà không cần reload thủ công.

## 12. Đối chiếu Backend API

Tất cả endpoint cần gửi JWT trong header `Authorization: Bearer <token>`, trừ API xem lịch trống và callback từ VNPay.

| Nghiệp vụ | Endpoint | Kết quả cần kiểm tra |
| --- | --- | --- |
| Danh sách đơn | `GET /api/bookings` | User chỉ nhận đơn của mình; Manager/Admin nhận toàn bộ; sắp xếp `id` giảm dần. |
| Lịch đã giữ | `GET /api/bookings/availability?date=YYYY-MM-DD&courtId=ID` | Trả `courtId`, `reservedCourtIds`, ngày, giờ, thời lượng và trạng thái; không trả thông tin khách. |
| Chi tiết đơn | `GET /api/bookings/:id/detail` | Có `field`, `courtDetail`, `reservedCourts` và `groupSchedule`; người không sở hữu đơn nhận HTTP 403. |
| Tạo đơn | `POST /api/bookings` | Backend tự đọc giá sân từ DB, tự tính dịch vụ/voucher/tổng tiền và không tin `total`, `discount`, `status` từ client. |
| Hủy đơn | `POST /api/bookings/:id/cancel` | Trả trạng thái hủy, mức hoàn, lý do; đơn nhóm chưa thanh toán trả thêm `cancelledBookingIds`. |
| Hàng chờ hoàn | `GET /api/bookings/refunds` | Chỉ staff; có mã giao dịch, cổng, ngân hàng, mã thanh toán và số tiền giao dịch gốc nếu có. |
| Xác nhận hoàn | `POST /api/bookings/:id/refund` | Chỉ Admin; cập nhật `refundStatus`, `paymentStatus`, tạo payment hoàn thủ công và notification. |
| Check-in | `POST /api/bookings/:id/check-in` | Chỉ Manager/Admin; chỉ đơn `confirmed` mới được chuyển thành `completed`. |
| Kiểm tra voucher | `POST /api/vouchers/validate` | User đã đăng nhập được gọi; trả mã chuẩn hóa, loại và `discountAmount`. |
| Quản trị voucher | `GET/POST/PATCH/DELETE /api/vouchers` | Chỉ Admin; kiểm tra mã trùng, giới hạn, thời gian hiệu lực và trạng thái. |
| Tạo URL VNPay | `POST /api/vnpay/create-url` | Số tiền được đối chiếu lại từ booking/payment trong DB; sai tiền hoặc sai chủ đơn bị từ chối. |
| Callback VNPay | `GET /api/vnpay/return`, `GET /api/vnpay/ipn` | Kiểm tra chữ ký, số tiền và tính idempotent; callback lặp không cộng tiền lần hai. |

Các mã lỗi quan trọng cần test: `400` dữ liệu/nghiệp vụ sai, `401` chưa đăng nhập, `403` sai quyền/chủ đơn, `404` không tồn tại, `409` trùng slot hoặc voucher vừa hết lượt.

## 13. Đối chiếu MongoDB

Có thể kiểm tra bằng MongoDB Compass. Không sửa trực tiếp dữ liệu trong DB khi đang chạy test luồng.

| Collection | Dữ liệu cần đối chiếu |
| --- | --- |
| `bookings` | Một document cho mỗi buổi; kiểm tra `bookingGroupId`, `bookingMode`, `reservedCourtIds`, `groupTotal`, `customer`, `services`, voucher, thanh toán, hoàn tiền và trạng thái. |
| `bookinggroups` | Một document cho cả nhóm; `bookingIds` phải đủ số buổi, `primaryBookingId` hợp lệ, tổng tiền và trạng thái thanh toán đồng nhất. |
| `bookingslots` | Mỗi document là một khóa 30 phút. Bao 3 sân trong 1 giờ phải tạo 6 khóa cho mỗi buổi; tổ hợp `courtId + date + time` là duy nhất. |
| `payments` | Có `paymentCode` duy nhất, `transactionCode`, `bookingId`, `bookingGroupId`, số tiền, loại thanh toán, trạng thái, `paidAt`; callback gốc lưu trong `rawData`. |
| `vouchers` | `code` viết hoa; `used` tăng đúng một lần khi giữ chỗ và giảm đúng một lần nếu đơn chưa thanh toán bị hủy/hết hạn. |
| `notifications` | Khi Admin xác nhận hoàn phải có notification `refund_completed` gắn đúng `bookingId` và user/email. |
| `fields`, `courts` | Giá, giờ mở cửa, trạng thái và quan hệ `court.fieldId` là nguồn tính tiền/kiểm tra lịch của Backend. |
| `users` | Vai trò chỉ thuộc `user`, `manager`, `admin`; API không được trả trường `password`. |

Khóa đối chiếu giữa các collection:

- `bookings.id` ↔ `payments.bookingId` ↔ `bookingslots.bookingId` ↔ `notifications.bookingId`.
- `bookings.bookingGroupId` ↔ `bookinggroups.id` ↔ `payments.bookingGroupId`.
- `bookings.fieldId` ↔ `fields.id`; `bookings.courtId` và `reservedCourtIds` ↔ `courts.id`.
- `bookings.customer.userId` ↔ `users.id` đối với đơn do user tự đặt.

Sau thanh toán nhóm, tất cả booking thành viên và `bookinggroups` phải cùng trạng thái. Sau hủy đơn chưa thanh toán, slot phải bị xóa và lượt voucher được trả lại. `payments.rawData`, `_id`, `__v`, mật khẩu và secret cấu hình là dữ liệu nội bộ, không yêu cầu trả ra Frontend.

## 14. Kiểm tra tự động đã chạy

- Backend payment flow: pass.
- Backend RBAC: pass.
- Frontend ESLint các file thay đổi: pass.
- Frontend production build: pass.

## 15. Commit theo nhóm thay đổi

- `65fcdbb` - phân quyền và bảo vệ booking.
- `e66d634` - payment, callback và phục hồi luồng thanh toán.
- `78c2071` - lịch nhóm, nhiều giai đoạn và bao sân.
- `761a629` - vé, QR và chi tiết đơn bao sân.
- `37a9a86` - chính sách hoàn 100%/50%/0%.
- `a694155` - voucher và vận hành hoàn tiền.
- `e984b77` - backend/frontend chặn giờ đã qua.
- `3331b10` - bỏ `.env` khỏi Git, thêm `.env.example`.
- `7cd8ec3` - chặn click giờ đã qua từ trang chi tiết sân.

## 16. Lưu ý bảo mật trước production

- Thu hồi Gmail App Password cũ và tạo App Password mới.
- Đổi `VNP_HASH_SECRET` nếu giá trị cũ là credential thật.
- Không gửi `.env` qua chat và không commit lại file này.
- Secret cũ vẫn tồn tại trong lịch sử Git; việc đổi credential là bắt buộc.

## 17. UI lịch dài hạn phục hồi sau conflict (`code_269`)

Các phần cần pull và test lại:

- Màn đặt sân có đủ `Một buổi`, `Hằng ngày`, `Hàng tuần`, `Trọn tháng`; lịch tối đa 60 buổi.
- Danh sách lịch hiển thị ngày, giờ và thời lượng từng buổi; lịch trên 12 buổi có nút xem/thu gọn toàn bộ.
- Nút `Sửa` cho phép đổi riêng ngày, giờ, thời lượng của một buổi. Trước khi sang bước tiếp theo và trước khi tạo đơn, FE gọi API kiểm tra toàn bộ lịch; buổi trùng trả về giờ thay thế hoặc cho phép bỏ riêng buổi đó.
- Backend lưu `duration` riêng cho mỗi booking con, khóa đúng số slot 30 phút và tính giá/tỷ lệ voucher theo giá trị từng buổi. Không cần thêm collection hay migrate DB; MongoDB dùng các field hiện có.
- `Đơn của tôi` gom các booking cùng `bookingGroupId` thành một card lịch dài hạn, hiển thị danh sách buổi và cho mở vé/đổi/hủy từng buổi.
- Vé tổng hiển thị toàn bộ lịch; chọn một dòng sẽ mở vé QR của buổi tương ứng.
- `Thuê thêm 1h` không còn tạo đơn tiền mặt rời. Hệ thống dùng luồng điều chỉnh booking group, kiểm tra slot và chuyển VNPay nếu có phụ thu.

Checklist nhanh:

1. Đặt lịch hằng ngày, hằng tuần và trọn tháng; xác nhận số buổi ở Paygate khớp số document `bookings`.
2. Sửa một buổi thành thời lượng khác, kiểm tra tổng tiền FE = `bookinggroups.total` và số `bookingslots` đúng (1 giờ = 2 slot, 1,5 giờ = 3 slot).
3. Chọn một buổi đã kín; phải thấy thông báo trùng cùng gợi ý giờ khác, không được tạo thiếu một phần lịch.
4. Vào `Đơn của tôi`; mỗi nhóm chỉ có một card, mở được vé tổng và vé con, đổi/hủy một buổi không ảnh hưởng các buổi còn lại.
5. Gia hạn một buổi; nếu giờ tiếp theo đã kín thì giữ nguyên đơn cũ, nếu có phụ thu thì đi qua thanh toán adjustment.

Kiểm tra tự động sau khi phục hồi: payment/booking flow, RBAC, venue management, TypeScript, ESLint tập trung và production build đều pass.

## 18. Đồng bộ DB local cho cả nhóm

Snapshot chuẩn hiện nằm tại `Backend/data/db-snapshot.json`. Snapshot này được xuất từ DB trên máy nguồn và phải được commit cùng code.

Mỗi thành viên chạy:

```bash
git pull origin feat/booking-shared-db-flow
cd Backend
test -f .env || cp .env.example .env # không ghi đè secret đang dùng
npm install
npm run db:reset
npm run dev
```

Trong `Backend/.env` của mô hình DB local từng máy:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/db_datn_su26
DB_RESET_ON_START=true
```

Sau khi start phải thấy log `[db] Đã xoá và nạp lại dữ liệu chuẩn`. Nếu snapshot lỗi, backend sẽ dừng thay vì tiếp tục với DB cũ.

Cảnh báo: `npm run db:reset` và `DB_RESET_ON_START=true` đều xóa dữ liệu DB local hiện tại trước khi nạp snapshot. Nếu cả nhóm dùng chung một MongoDB server/Atlas thì không chạy reset và phải đặt `DB_RESET_ON_START=false` trên tất cả máy.
