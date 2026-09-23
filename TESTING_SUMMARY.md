# Tóm tắt phần mới để team test

Branch: `feat/booking-shared-db-flow`

## Đặt sân và thanh toán

- Tạo đơn trước khi đi Paygate, giữ sân ở trạng thái `pending/unpaid` trong 15 phút.
- Khóa slot 30 phút bằng collection `bookingslots`; hai người đặt trùng thì request đến sau bị từ chối.
- Slot sân mờ ngay khi tạo đơn; tự đồng bộ khi quay lại tab và mỗi 10 giây, không cần F5.
- Hỗ trợ cọc 30%, thanh toán 70% còn lại và VNPay callback.
- Đơn chưa thanh toán hết hạn tự hủy, nhả lại slot.

## Hủy đơn và hoàn tiền

- Đơn chưa thanh toán: hủy ngay, không cần ngân hàng/STK.
- Đơn đã cọc/đã thanh toán: chỉ hủy trước giờ sân ít nhất 2 tiếng; khách nhập ngân hàng + STK.
- Khách thấy trạng thái `Đang hoàn tiền` hoặc `Đã hoàn tiền` kèm số tiền, ngân hàng, STK.
- Đơn đã hủy không hiển thị QR check-in.

## Admin

- Có hàng chờ hoàn tiền, tổng số tiền cần hoàn và bộ lọc `Chờ hoàn tiền`.
- Popup xử lý hoàn tiền có tên khách, ngân hàng, STK, số tiền, nội dung chuyển khoản và nút sao chép.
- Admin chỉ xác nhận sau khi đã chuyển tiền thật.
- Check-in và xác nhận hoàn tiền yêu cầu quyền admin.
- Danh sách đơn admin tự cập nhật mỗi 10 giây hoặc khi quay lại tab.

## Thông báo khách hàng

- Khi admin hoàn tiền, backend ghi notification `refund_completed` vào collection `notifications`.
- Trang `Đơn của tôi` polling mỗi 10 giây, hiện toast và tự đổi trạng thái đơn mà không cần F5.

## DB và chạy local

- Archive mới nhất: `Backend/db_datn_su26.archive.gz`.
- Archive có: `bookings`, `bookingslots`, `payments`, `notifications`, `users`, `courts`, `fields`, `vouchers`, `counters`.
- Hướng dẫn import/chạy local: `Backend/DB_SETUP.md`.
- Không dùng `ALLOW_IN_MEMORY_DB=true` khi team test vì dữ liệu sẽ mất khi backend restart.

## Lưu ý test nhiều máy

- Các máy phải dùng chung Backend và MongoDB.
- Máy khác mở frontend qua IP máy chủ, không mở `localhost` của chính máy đó.
