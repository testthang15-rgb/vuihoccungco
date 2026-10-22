# VUI HỌC CÙNG CÔ 🎈
Ứng dụng trò chơi tương tác mầm non thời gian thực kết hợp **TRÌNH SOẠN GAME TƯƠNG TÁC KÉO – THẢ** dành cho giáo viên và các bé 5–6 tuổi.

---

## 🎨 TÍNH NĂNG MỚI: TRÌNH SOẠN GAME KÉO – THẢ (GAME BUILDER)

Hệ thống cho phép giáo viên mầm non tự thiết kế trực quan các trò chơi tương tác chuẩn màn hình 16:9 (1280x720) mà không cần lập trình:

### 1. Bố cục không gian làm việc 3 khu vực (3-Area Workspace):
- **Khu vực 1 (Toolbox Sidebar)**:
  - Bảng thành phần: Văn bản (📝), Vùng đích (🎯 Drop Zone), Thẻ kéo (↔ Draggable Item), Thẻ từ (🃏 Word Card), Khung hình (📦 Shape).
  - Kho mẫu trò chơi (Templates): Mẫu U – Ư, Mẫu A – Ă – Â, Mẫu Thẻ từ, Mẫu Chọn hình.
  - Kho tài nguyên tranh ảnh (Asset Library): 6 danh mục mầm non (Chữ cái, Động vật, Trái cây, Thiên nhiên, Trường học, Chữ số).
  - Quản lý các màn câu hỏi trong game (Questions Stack).
- **Khu vực 2 (Canvas 1280 × 720)**:
  - Mô phỏng chính xác màn hình trẻ sẽ nhìn thấy, tự động co giãn (responsive scale) trên mọi kích thước màn hình điện thoại/máy tính bảng.
  - Hỗ trợ di chuyển đối tượng, bắt lưới căn chỉnh (Grid Snap 10px), nhân bản, xóa, đổi kích thước.
- **Khu vực 3 (Bảng thuộc tính - Properties Sidebar)**:
  - Tùy chỉnh tọa độ X/Y, kích thước Width/Height, nội dung chữ, cỡ chữ, màu sắc, bo góc, viền, đổ bóng.
  - **Gán đáp án đúng (Interaction Rules)**: Giáo viên chỉ cần chọn Thẻ kéo và chọn Ô đích tương ứng trong danh sách, hệ thống tự động lưu quan hệ `{ sourceId, targetId, isCorrect: true, points: 5 }`.
  - Hiệu ứng sinh động (Bounce, Pulse, Float, Shake, Pop).

### 2. Các công cụ hỗ trợ giáo viên:
- **⚡ TẠO NHANH (Quick Create)**: Nhập tên chữ (ví dụ U và Ư, hoặc A và Ă) cùng số lượng thẻ (4, 6, 8 thẻ), hệ thống tự động sinh 2 vùng đích, các thẻ tương ứng và tự động gán đáp án đúng 100%.
- **👁 XEM TRƯỚC (Play Preview)**: Mô phỏng trải nghiệm kéo thả thực tế của học sinh ngay trên màn hình soạn thảo kèm âm thanh snap, rung khi thả sai và pháo hoa khi hoàn thành.
- **🔍 KIỂM TRA GAME (Validation Banner)**: Tự động rà soát phát hiện các lỗi thiếu vùng đích, thẻ chưa gán ô, câu hỏi thiếu tiêu đề trước khi xuất bản.
- **💾 Lưu bản nháp (Draft) & Xuất bản (Publish)**.

---

## 📱 TRẢI NGHIỆM TRÊN ĐIỆN THOẠI HỌC SINH (PLAYER)

- Tuyệt đối không hiển thị thanh công cụ của trình soạn; trẻ chỉ thấy giao diện chơi sạch sẽ, nút to rõ.
- Hỗ trợ đầy đủ cảm ứng đa điểm (`pointerdown`, `pointermove`, `pointerup`, `touch-action: manipulation`).
- **Thao tác mượt mà**: Chạm giữ thẻ ➔ kéo đến ô đích ➔ thả vào ô (hiệu ứng hút dính *snap-in* kèm âm thanh vui nhộn). Nếu thả ngoài ô, thẻ rung nhẹ và tự động quay về vị trí ban đầu.
- **Đồng bộ tiến độ theo thời gian thực**: Khi trẻ xếp được từng thẻ (ví dụ `3/6 thẻ`), máy cô lập tức cập nhật thanh tiến độ mà không lộ nội dung đáp án.
- Tự động nộp bài và khóa thẻ khi đã xếp đủ tất cả các thẻ.

---

## 🚀 HƯỚNG DẪN CHẠY VÀ KIỂM THỬ

### 1. Khởi chạy:
```bash
npm run dev
```
Truy cập `http://localhost:3000`.

### 2. Thử nghiệm Trình soạn game:
1. Tại Trang chủ, bấm **TẠO TRÒ CHƠI**.
2. Bấm nút **⚡ TẠO NHANH BỘ TRÒ CHƠI**.
3. Chọn chữ cái (U và Ư), chọn 6 thẻ ➔ Bấm **TỰ ĐỘNG TẠO BỐ CỤC**.
4. Di chuyển, đổi màu hoặc thêm ảnh từ **Kho ảnh**.
5. Bấm **XEM TRƯỚC** để thử kéo thả như học sinh thật.
6. Bấm **XUẤT BẢN GAME** để lưu vào ngân hàng trò chơi.

### 3. Thử nghiệm thi đấu trực tiếp (1 Máy cô + 4 Điện thoại):
1. Máy cô bấm **CHƠI NGAY** bộ trò chơi vừa tạo ➔ Màn hình hiển thị mã QR và mã phòng 5 ký tự.
2. 4 điện thoại quét mã QR và chọn 4 đội: ☀️ Mặt Trời, 🌈 Cầu Vồng, 🌸 Bông Hoa, ☁️ Đám Mây.
3. Cô bấm **BẮT ĐẦU**:
   - Tất cả điện thoại đồng thời chuyển sang màn chơi kéo thả.
   - Các bé kéo thẻ chữ vào ô trên điện thoại.
   - Máy cô theo dõi tiến độ hoàn thành của từng đội theo thời gian thực.
   - Khi kết thúc câu, máy cô công bố chi tiết số thẻ từng đội xếp đúng và cộng điểm.
   - Xem tổng kết và xuất file báo cáo kết quả buổi học.
