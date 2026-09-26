# Dữ liệu MongoDB chung cho team

Dữ liệu chuẩn của team nằm trong file **`Backend/data/db-snapshot.json`**, commit
cùng code lên GitHub. Mỗi lần backend khởi động, nó sẽ:

1. Lưu bản sao dữ liệu local hiện tại vào `Backend/backups/last-before-reset.json`
   (chỉ giữ bản gần nhất, không commit).
2. **Xoá toàn bộ dữ liệu** trong MongoDB local.
3. Nạp lại dữ liệu từ `data/db-snapshot.json` (kèm index chống đặt trùng khung giờ).

Nhờ vậy sau `git pull` và chạy app, mọi máy có cùng dữ liệu.

> Dữ liệu tạo thêm trên máy local (đơn đặt, tài khoản…) sẽ **mất ở lần khởi động
> sau**. Muốn giữ, hãy xuất lại file chuẩn và commit (xem bên dưới), hoặc đặt
> `DB_RESET_ON_START=false` trong `.env` khi cần giữ dữ liệu tạm thời.

## Chạy project

```bash
# Docker (khuyến nghị)
docker compose up -d --build

# Hoặc chạy tay với MongoDB local ở mongodb://127.0.0.1:27017
cd Backend && npm install && npm run dev
```

## Cập nhật dữ liệu chuẩn

Khi dữ liệu đang chạy là bản muốn chia sẻ cho cả team:

```bash
# Docker
docker compose exec backend npm run db:export

# Chạy tay
cd Backend && npm run db:export
```

Lệnh ghi đè `Backend/data/db-snapshot.json`. Commit và push file này; các máy khác
`git pull` rồi khởi động lại backend là có dữ liệu mới.

> Chú ý: lần khởi động tiếp theo sẽ nạp lại file chuẩn, nên hãy `db:export`
> **trước** khi restart nếu muốn giữ dữ liệu vừa tạo.

## Lệnh khác

| Lệnh | Tác dụng |
|---|---|
| `npm run db:export` | Xuất dữ liệu MongoDB hiện tại ra `data/db-snapshot.json` |
| `npm run db:reset` | Xoá và nạp lại dữ liệu chuẩn ngay, không cần restart backend |
| `DB_RESET_ON_START=false` (trong `.env`) | Tắt việc xoá/nạp lại khi khởi động |

Với Docker, thêm `docker compose exec backend` phía trước các lệnh `npm run`.

## Khôi phục khi lỡ tay

`Backend/backups/last-before-reset.json` có cùng định dạng với file chuẩn. Muốn
dùng lại, chép nó đè lên `data/db-snapshot.json` rồi chạy `npm run db:reset`.

## Bảo mật

File chuẩn chứa email, số điện thoại khách và mật khẩu đã mã hoá của các tài
khoản. Chỉ đẩy lên **repository private**.

File `db_datn_su26.archive.gz` là bản export cũ, không còn được dùng khi khởi động.
