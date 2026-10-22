# Kế hoạch mở rộng: Xác thực Tài khoản Đa phương thức & Lưu trữ trò chơi riêng biệt với Supabase

Kế hoạch chi tiết kết nối cơ sở dữ liệu và hệ thống xác thực Supabase, cho phép giáo viên linh hoạt **đăng nhập bằng Google** hoặc **tự đăng ký tài khoản bằng Email & Mật khẩu** trực tiếp trên website. Trò chơi được tự động lưu trữ và đồng bộ riêng biệt theo từng tài khoản, hỗ trợ bật/tắt quyền chia sẻ công khai cho đồng nghiệp.

> [!IMPORTANT]
> **LÀM RÕ ĐỊA CHỈ & MÔ HÌNH VẬN HÀNH WEBSITE:**
> - **Website của bạn VẪN CHẠY 100% TRÊN ĐỊA CHỈ CỦA AI STUDIO** (ví dụ: `https://ais-pre-...asia-east1.run.app` hoặc tên miền riêng của bạn).
> - **Học sinh quét mã QR và giáo viên truy cập** vẫn vào đúng địa chỉ website AI Studio như hiện nay.
> - **Supabase CHỈ LÀ HỆ THỐNG DỮ LIỆU NGẦM (Backend)**: Đóng vai trò là "chiếc két an toàn" trên đám mây để lưu trữ tài khoản và danh sách trò chơi. Website trên AI Studio sẽ kết nối tới Supabase qua API để lấy dữ liệu về.

---

## 1. So sánh chi tiết: Supabase vs Cloudflare

Đối với nhu cầu: **Giáo viên đăng nhập (Google hoặc Email/Mật khẩu) và lưu trữ các bài giảng/trò chơi riêng theo từng tài khoản**:

| Tiêu chí so sánh | Supabase (Khuyên dùng ⭐⭐⭐⭐⭐) | Cloudflare (Workers + D1) |
| :--- | :--- | :--- |
| **Bản chất dịch vụ** | Nền tảng Backend-as-a-Service (BaaS) hoàn chỉnh, chuyên biệt cho ứng dụng web hiện đại. | Mạng phân phối nội dung (CDN), tường lửa và hạ tầng điện toán biên (Edge Computing). |
| **Tính năng Đăng nhập (Auth)** | **Có sẵn 100%**: Hỗ trợ sẵn Google OAuth 1 chạm, Đăng ký Email/Mật khẩu, quản lý phiên, gửi email khôi phục mật khẩu. | **Không có sẵn cho người dùng cuối**: Phải tự lập trình từ đầu (tự mã hóa mật khẩu, tự viết hàm cấp phát token JWT, xử lý redirect OAuth trên Worker). |
| **Cơ sở dữ liệu (Database)** | **PostgreSQL mạnh mẽ**: Hỗ trợ kiểu `JSONB` cực kỳ lý tưởng để lưu cấu hình câu hỏi, tọa độ kéo thả canvas của trò chơi. | **Cloudflare D1 (SQLite)**: Nhẹ và phân tán ở biên, nhưng công cụ quản trị và hỗ trợ JSON còn sơ khai hơn PostgreSQL. |
| **Phân quyền dữ liệu (Bảo mật)** | **Row Level Security (RLS)**: Chỉ vài dòng SQL là tự động đảm bảo cô nào chỉ xem/sửa game của cô đó, không sợ lộ đề. | Phải tự viết logic kiểm tra quyền trong code Worker ở từng API endpoint. |
| **Giao diện quản trị (Dashboard)** | Trực quan như Google Sheets / Excel, bấm vào xem và sửa trực tiếp dữ liệu game rất dễ dàng. | Giao diện quản lý kỹ thuật, tập trung vào cấu hình tên miền, tường lửa, log mạng. |
| **Thời gian & độ dễ triển khai** | **Cực kỳ dễ & nhanh**: Chỉ cần cài thư viện `@supabase/supabase-js`, gọi hàm có sẵn là hoạt động ngay. | **Phức tạp hơn rất nhiều**: Phải dựng Worker, cấu hình định tuyến API, tự viết middleware xác thực. |
| **Chi phí** | Gói miễn phí rất hào phóng (500MB database, 50.000 người dùng hoạt động/tháng). | Gói miễn phí hỗ trợ CDN và Workers tốt, nhưng tính năng cơ sở dữ liệu có giới hạn số lần ghi. |

---

## 2. Mô hình kết nối giữa AI Studio & Supabase

```
┌────────────────────────────────────────────────────────────────────────┐
│             NGƯỜI DÙNG TRUY CẬP (Giáo viên & Học sinh)                 │
│                 https://ais-pre-...run.app (AI STUDIO)                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               ỨNG DỤNG "VUI HỌC CÙNG CÔ" (Chạy trên AI Studio)         │
│  - Giao diện giáo viên, màn hình máy chiếu, màn hình điện thoại trẻ em │
│  - Hệ thống phòng chơi Realtime WebSocket                              │
│  - Hộp thoại AuthModal: [Tiếp tục với Google] / [Email & Mật khẩu]     │
│  - Biến môi trường kết nối: VITE_SUPABASE_URL, VITE_ANON_KEY           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Giao tiếp ngầm qua API)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE (Dữ liệu Đám mây)                      │
│  - Supabase Auth: Quản lý danh sách tài khoản giáo viên                │
│  - PostgreSQL Database: Bảng 'games' lưu câu hỏi, kéo thả canvas       │
│  - Row Level Security: Tự động bảo mật trò chơi của từng cô            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Trải nghiệm người dùng & Giao diện (UX & Visual Flow)

### A. Hộp thoại Đăng nhập / Đăng ký (`AuthModal.tsx`)
- Nút bấm **"Tiếp tục với Google"** 1 chạm nhanh chóng.
- Phân cách bằng đường kẻ `"hoặc sử dụng Email & Mật khẩu"`.
- Hai tab chuyển đổi linh hoạt:
  - **[Đăng nhập]**: Email + Mật khẩu + Nút ẩn/hiện mật khẩu 👁️.
  - **[Đăng ký]**: Tên giáo viên + Email + Mật khẩu + Xác nhận mật khẩu.
- Hiển thị thông báo phản hồi hoàn toàn bằng tiếng Việt thân thiện.

### B. Thanh tiêu đề trên cùng (Top Navigation)
- **Chưa đăng nhập**: Nút **"Đăng nhập"** trang nhã. Người dùng vẫn chơi thử được các game mẫu có sẵn.
- **Đã đăng nhập**: Hiển thị Avatar tròn (ảnh đại diện Google hoặc chữ cái đầu tên cô) kèm menu tài khoản:
  - *Tên giáo viên & Email*.
  - *Trò chơi của tôi*.
  - *Đăng xuất an toàn*.

### C. Kho trò chơi mầm non (Game Library)
- **Tab 1 - Trò chơi của tôi**: Các trò chơi do chính cô tạo, kèm nút bật/tắt **Chia sẻ công khai** và nút sao chép link.
- **Tab 2 - Kho trò chơi mẫu**: Trò chơi tiêu chuẩn có sẵn, có nút **"Sao chép về tài khoản của tôi"**.
- **Tab 3 - Cộng đồng chia sẻ**: Trò chơi do các giáo viên khác công khai chia sẻ.

---

## 4. Cấu trúc bảng cơ sở dữ liệu trên Supabase

```sql
-- Tạo bảng lưu trữ trò chơi
create table public.games (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text,
  user_name text,
  title text not null,
  description text default '',
  thumbnail text default '',
  game_type text not null default 'interactive',
  game_url text,
  questions jsonb not null default '[]'::jsonb,
  canvas_config jsonb,
  is_public boolean not null default false,
  share_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  deleted_at timestamptz
);

-- Chỉ mục truy vấn tốc độ cao
create index idx_games_user_id on public.games(user_id);
create index idx_games_is_public on public.games(is_public) where is_public = true;

-- Kích hoạt Row Level Security (RLS) bảo vệ dữ liệu độc lập
alter table public.games enable row level security;

-- Quyền đọc: Xem game của chính mình HOẶC game công khai
create policy "Allow read own or public games"
on public.games for select
using (auth.uid() = user_id or is_public = true);

-- Quyền thêm: Gán đúng user_id của giáo viên đang đăng nhập
create policy "Allow insert own games"
on public.games for insert
with check (auth.uid() = user_id);

-- Quyền sửa: Chỉ sửa game của mình
create policy "Allow update own games"
on public.games for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Quyền xóa: Chỉ xóa game của mình
create policy "Allow delete own games"
on public.games for delete
using (auth.uid() = user_id);
```

---

## 5. Lộ trình thực hiện chi tiết

1. **Bước 1**: Cài đặt `@supabase/supabase-js`, tạo cấu hình môi trường `.env.example` và dịch vụ kết nối `src/services/supabaseClient.ts` (có cơ chế dự phòng ngoại tuyến mượt mà nếu chưa điền key).
2. **Bước 2**: Xây dựng `src/context/AuthContext.tsx` và component `src/components/auth/AuthModal.tsx` hỗ trợ cả Google OAuth và Email/Mật khẩu.
3. **Bước 3**: Cập nhật thanh Header hiển thị nút Đăng nhập / Avatar tài khoản.
4. **Bước 4**: Nâng cấp `gameStorage.ts` kết nối Supabase, phân tách game theo từng `user_id` và hỗ trợ chia sẻ công khai.
5. **Bước 5**: Bổ sung 3 tab trong Kho trò chơi (`GameList.tsx`): Trò chơi của tôi, Kho mẫu, Cộng đồng.
6. **Bước 6**: Kiểm thử đăng nhập, tạo game, phân quyền độc lập giữa các tài khoản và hoàn thiện.
