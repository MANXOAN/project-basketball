# MongoDB local cho team

File `db_datn_su26.archive.gz` là bản export MongoDB nén của database
`db_datn_su26`. Mỗi người import file này một lần để có cùng dữ liệu khởi tạo.

## 1. Chạy MongoDB

Đảm bảo MongoDB đang chạy ở `mongodb://127.0.0.1:27017`.

## 2. Import database

Chạy từ thư mục `Backend`:

```bash
mongorestore --uri="mongodb://127.0.0.1:27017/db_datn_su26" --archive="db_datn_su26.archive.gz" --gzip --drop
```

`--drop` chỉ dùng khi muốn thay toàn bộ dữ liệu local bằng bản chuẩn của team.

## 3. Chạy project

```bash
# terminal 1
cd Backend
npm install
PORT=3000 MONGODB_URI="mongodb://127.0.0.1:27017/db_datn_su26" npm run dev

# terminal 2
cd Frontend
npm install
VITE_BACKEND_URL="http://127.0.0.1:3000" npm run dev -- --host 0.0.0.0
```

Không đặt `ALLOW_IN_MEMORY_DB=true` khi test cùng team: giá trị này tạo DB tạm
trong RAM và dữ liệu sẽ mất khi backend khởi động lại.
