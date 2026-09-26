# Hướng dẫn chuyển code sang repository của team

## Mục tiêu

- Repo nguồn: `https://github.com/MANXOAN/project-basketball`
- Repo đích: `https://github.com/Sonnnph61360/DATNSM26`
- Chỉ chuyển trạng thái source code hiện tại, không nhập lịch sử Git từ repo nguồn.
- Tạo một commit mới có Author và Committer là người thực hiện.
- Giữ nguyên lịch sử đang có của repo đích và không force-push.

## Thông tin cần chuẩn bị

Thay các giá trị sau trong câu lệnh:

- `TEN_NHANH_CUA_BAN`: nhánh đã tạo trong repo đích.
- `TEN_CUA_BAN`: tên muốn hiển thị trên commit.
- `EMAIL_GITHUB_DA_XAC_MINH`: email đã được xác minh trong GitHub Settings → Emails.

Người thực hiện phải đăng nhập GitHub bằng tài khoản có quyền ghi vào repo đích.

## 1. Lấy code mới nhất từ repo nguồn

```bash
git clone https://github.com/MANXOAN/project-basketball.git project-source
cd project-source
git switch feat/booking-shared-db-flow
git pull origin feat/booking-shared-db-flow
git status
```

`git status` phải không có thay đổi source code chưa commit.

Xuất source code nhưng không mang theo thư mục `.git` và lịch sử tác giả cũ:

```bash
git archive HEAD -o /tmp/DATNSM26-source.tar
```

## 2. Clone repo đích vào thư mục mới

```bash
cd /tmp
git clone https://github.com/Sonnnph61360/DATNSM26.git DATNSM26-target
cd DATNSM26-target
git fetch origin
```

## 3. Chuyển sang nhánh đã tạo trong repo đích

```bash
git switch --track origin/TEN_NHANH_CUA_BAN
```

Nếu nhánh đã tồn tại ở local:

```bash
git switch TEN_NHANH_CUA_BAN
git pull origin TEN_NHANH_CUA_BAN
```

Tên nhánh phân biệt chữ hoa và chữ thường.

## 4. Cấu hình Author và Committer

Cấu hình chỉ trong repo đích, không thay đổi Git toàn máy:

```bash
git config --local user.name "TEN_CUA_BAN"
git config --local user.email "EMAIL_GITHUB_DA_XAC_MINH"
```

Kiểm tra:

```bash
git config --local user.name
git config --local user.email
```

Không tiếp tục nếu vẫn hiển thị tên hoặc email của người cũ.

## 5. Thay source code trên nhánh đích

Chỉ chạy các lệnh sau trong bản clone mới `/tmp/DATNSM26-target`:

```bash
git rm -r -- .
tar -xf /tmp/DATNSM26-source.tar
git add -A
```

Kiểm tra thay đổi:

```bash
git status
git diff --cached --stat
```

Không commit nếu thấy các file/thư mục cục bộ như `.env`, `node_modules`, `dist`, `.codex` hoặc `.history`.

## 6. Tạo commit mới bằng tên của bạn

```bash
git commit \
  --author="TEN_CUA_BAN <EMAIL_GITHUB_DA_XAC_MINH>" \
  -m "feat: integrate completed booking management system"
```

Kiểm tra lần cuối:

```bash
git log -1 --format="Author: %an <%ae>%nCommitter: %cn <%ce>"
```

Cả Author và Committer phải là tên/email của bạn. Email phải được GitHub xác minh thì commit mới liên kết đúng tài khoản.

## 7. Push lên đúng nhánh

```bash
git push origin TEN_NHANH_CUA_BAN
```

Không dùng `--force`. Sau khi push, tạo Pull Request từ `TEN_NHANH_CUA_BAN` vào `main`.

## Kết quả mong đợi

- Repo nguồn không bị thay đổi.
- Repo đích vẫn giữ các commit đã có.
- Lịch sử commit/tác giả của repo nguồn không được nhập sang repo đích.
- Toàn bộ source code hiện tại xuất hiện trong một commit mới mang tên người thực hiện.
- Tài khoản hiển thị là người push phụ thuộc vào tài khoản GitHub/SSH/PAT đang đăng nhập.

## Lưu ý về DB demo

Snapshot DB demo nằm tại `Backend/data/db-snapshot.json`. Sau khi nhận code, mỗi người dùng MongoDB local chạy:

```bash
cd Backend
npm install
npm run db:reset
npm run dev
```

Trong `Backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/db_datn_su26
DB_RESET_ON_START=true
```

Nếu cả team dùng chung MongoDB server/Atlas thì không chạy reset và phải đặt `DB_RESET_ON_START=false`.
