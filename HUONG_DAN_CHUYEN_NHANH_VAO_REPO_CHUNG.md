# Chuyển nguyên nhánh code từ repo MANXOAN sang repo chung

Hướng dẫn này chỉ chuyển nhánh `feat/booking-shared-db-flow` từ
`MANXOAN/project-basketball` sang **một nhánh mới** trong
`Sonnnph61360/DATNSM26`. Người thực hiện cần quyền đẩy nhánh lên repo chung.
Nhánh `main` của repo chung chưa thay đổi ở bước này; team sẽ tự review và merge
sau.

## 1. Dùng bản code repo Sơn đang có trên máy

Mở terminal trong thư mục project đã lấy từ repo Sơn và kiểm tra remote:

```bash
git remote -v
git status --short
```

Chỉ tiếp tục nếu `origin` trỏ đến repo `Sonnnph61360/DATNSM26` (URL HTTPS
hoặc SSH đều được). Nếu `origin` đang trỏ đến repo khác, cần xác định đúng thư
mục repo Sơn trước khi đẩy. Các lệnh tiếp theo không
đổi nhánh hiện tại và không chép đè các file đang làm trên máy.

Thêm repo MANXOAN làm nguồn và lấy đúng nhánh đã đẩy:

```bash
git remote add manxoan https://github.com/MANXOAN/project-basketball.git
git fetch manxoan feat/booking-shared-db-flow
```

Nếu `git remote add` báo tên `manxoan` đã tồn tại, chạy
`git remote get-url manxoan` để kiểm tra URL. Nếu URL đã đúng, bỏ qua lệnh
`remote add` và chạy tiếp `git fetch`.

Lệnh `fetch` lấy toàn bộ commit cần cho nhánh nguồn, không chép đè file trong
thư mục đang làm. **Nhánh cần lấy là `feat/booking-shared-db-flow`, không phải
`main` của repo MANXOAN.**

## 2. Xác nhận commit nguồn rồi đẩy nguyên nhánh

```bash
git rev-parse manxoan/feat/booking-shared-db-flow
git push origin manxoan/feat/booking-shared-db-flow:refs/heads/import/manxoan-booking
```

Lệnh `rev-parse` cho mã commit mới nhất của nhánh nguồn tại thời điểm lấy code.
Ghi lại mã đó để đối chiếu sau khi đẩy; không dùng mã commit cũ từ tin nhắn
hoặc ảnh chụp màn hình.

Lệnh `push` tạo nhánh `import/manxoan-booking` trên repo chung. Nó không sửa
`main` và không xoá nhánh ở repo MANXOAN. Nếu Git báo không có quyền ghi, nhờ
người có quyền trong repo chung chạy bước này. Nếu nhánh đích đã tồn tại và Git
từ chối cập nhật, kiểm tra nhánh đó hoặc chọn tên nhánh import mới; không dùng
`--force`.

## 3. Kiểm tra đã chuyển đủ code và lịch sử commit

```bash
git ls-remote origin refs/heads/import/manxoan-booking
git rev-parse manxoan/feat/booking-shared-db-flow
```

Hai mã commit phải **giống hệt nhau**. Khi đó nhánh ở repo chung trỏ tới đúng
commit nguồn, gồm toàn bộ file và lịch sử Git đi tới commit đó. Có thể mở nhánh
`import/manxoan-booking` trên GitHub để kiểm tra lại giao diện.

## Sau khi chuyển nhánh

Team mở Pull Request từ `import/manxoan-booking` vào `main` của repo chung và
tự xử lý conflict, kiểm thử trước khi merge. `main` của repo chung đã phát triển
thêm nhiều commit, nên **việc chuyển nhánh thành công không có nghĩa PR sẽ tự
merge được**. Không tải ZIP rồi chép file đè, không dùng `git push --force` hay
`git reset --hard` để xử lý conflict.

Các lệnh trên chỉ chuyển code Git. MongoDB đang chạy trên máy MANXOAN không nằm
trong Git; file `Frontend/db.json` là dữ liệu seed, không phải bản sao lịch sử
đơn đặt sân. Không chạy `npm run seed` trên database đang có dữ liệu cần giữ.
