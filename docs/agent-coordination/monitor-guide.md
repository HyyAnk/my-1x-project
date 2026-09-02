# ⚡ Cẩm Nang Vận Hành: 3D Neural Agent Coordination Dashboard

Dashboard 3D Neural Agent Coordination là hệ thống giám sát thời gian thực dạng mạng lưới nơ-ron thần kinh 3D (Three.js), giúp lập trình viên và người vận hành theo dõi trực quan trạng thái hoạt động của các AI Agent trong dự án, phân vùng nào đang được chỉnh sửa, phân vùng nào độc lập hoàn toàn có thể giao việc song song mà không sợ xung đột.

---

## 1. Khởi động và Tắt Dashboard

### Cách 1: 1-Click bằng file `.bat` (Khuyên dùng trên Windows)
- **Khởi động**: Double-click vào file [`run-agent-monitor.bat`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/run-agent-monitor.bat) ở thư mục gốc dự án (hoặc tại `scripts/coordination/run-monitor.bat`).
  - Tự động kiểm tra Node.js.
  - Khởi động server tại cổng `3344`.
  - Tự động bật trình duyệt mặc định tại `http://localhost:3344/`.
- **Tắt server**: Double-click vào file [`stop-agent-monitor.bat`](file:///d:/1a%20Cursor%20Project/My%201x%20Project/stop-agent-monitor.bat) ở thư mục gốc (hoặc tại `scripts/coordination/stop-monitor.bat`) để giải phóng cổng 3344 ngay lập tức.

### Cách 2: Bằng dòng lệnh CLI
```bash
# Khởi động và tự động mở trình duyệt
node scripts/coordination/monitor-server.mjs --port 3344 --open

# Hoặc dùng script wrapper trong scripts/
scripts\agent-monitor.cmd --open
```

---

## 2. Ý Nghĩa Màu Sắc & Ngôn Ngữ Hình Ảnh 3D

Mạng lưới gồm **19 hạch nơ-ron** đại diện cho 19 vùng phân quyền trong codebase:

| Màu sắc | Tên trạng thái | Ý nghĩa vận hành |
| :--- | :--- | :--- |
| 🟢 **Neon Cyan (`#00f0ff`)** | **Available (Idle)** | Vùng tự do, không có agent nào đang chỉnh sửa hay đọc khóa. **Sẵn sàng để giao việc ngay.** |
| 🔴 **Neon Magenta (`#ff0055`)** | **Active Claim** | Vùng đang bị một Agent **khóa ghi độc quyền**. Không giao thêm task vào vùng này để tránh đè code. |
| 🟡 **Amber (`#f59e0b`)** | **Read-Stable** | Vùng đang được một Agent dùng làm thư viện tham chiếu ổn định. Bất kỳ lệnh ghi nào vào vùng này sẽ bị chặn. |
| 🟢 **Neon Green (`#10b981`)** | **Safe Disjoint** | Xuất hiện khi bật chế độ *Find Safe Zones*. Các vùng này **hoàn toàn an toàn để giao việc song song** cho agent khác. |
| 🟣 **Royal Purple (`#a855f7`)** | **Core Hub** | Vùng trung tâm cốt lõi (`shared-contracts`) chứa các định nghĩa dùng chung của toàn bộ dự án. |

- **Sợi trục Synapse (Axons)**: Các đường cong nối giữa các nơ-ron thể hiện mối quan hệ phụ thuộc (`readStableDependencies`).
- **Chùm hạt xung điện (Impulse Particles)**: Chạy dọc theo sợi trục khi có một zone liên quan đang active, thể hiện luồng dữ liệu đang được tác động.

---

## 3. Quy Trình Phân Bổ Công Việc Song Song (Parallel Agent Assignment)

Một trong những ưu điểm vượt trội nhất của Dashboard là tính năng **Ma Trận Safe-to-Work**:

1. Khi bạn đang có **Agent 1** thực hiện một task tại một Zone (ví dụ: `server-pipeline`).
2. Bạn mở Dashboard, click vào hạch nơ-ron `server-pipeline`.
3. Bấm nút **"🎯 Find Safe Zones"** trong Drawer bên phải:
   - Trong không gian 3D, tất cả các zone **an toàn tuyệt đối để giao việc cho Agent 2 cùng lúc** sẽ bừng sáng màu **Xanh Lục Neon (`#10b981`)**.
   - Các zone có nguy cơ xung đột hoặc phụ thuộc vào Agent 1 sẽ tự động bị làm mờ (opacity 20%).
4. Bạn chỉ cần chọn một trong các zone màu xanh lục, bấm **"📋 Copy Claim CLI"** để lấy mẫu lệnh phân việc cho Agent tiếp theo.
5. Khi không còn cần xem ma trận an toàn, bấm **"❌ Exit Safe-Zone Mode"** hoặc **"🎯 Reset View"**.

---

## 4. Cảnh Báo Sức Khỏe Agent (Stale / Zombie Detection)

- **Cơ chế Heartbeat**: Mọi Claim đang hoạt động phải duy trì nhịp tim (`heartbeat`) định kỳ (ngưỡng tối đa 15 phút).
- **Phát hiện sự cố**: Nếu một Agent bị crash, đơ terminal hoặc thoát mà quên release:
  - Hạch nơ-ron tương ứng trong 3D sẽ **chớp tắt giật liên tục (Warning Strobe ⚠️)**.
  - Trên đỉnh màn hình xuất hiện **Banner đỏ cảnh báo**: `"⚠️ Stale claim detected on zone X (Agent Y timed out)"`.
  - Quản trị viên chỉ cần chạy lệnh giải phóng để gỡ bỏ khóa bị kẹt:
    ```bash
    node scripts/agent-release.mjs --claim <claim-id> --force
    ```

---

## 5. Thao Tác Điều Hướng 3D

- **Xoay 360 độ**: Giữ chuột trái và di chuyển chuột.
- **Di chuyển góc nhìn (Pan)**: Giữ chuột phải và kéo chuột.
- **Thu phóng (Zoom)**: Cuộn con lăn chuột.
- **Tự động xoay (Cinematic)**: Bấm nút **"🔄 Auto-Rotate"** ở góc dưới bên trái.
- **Căn lại góc nhìn chuẩn**: Bấm nút **"🎯 Reset View"**.
- **Tra cứu tổng thể**: Bấm nút **"📊 Work Matrix"** để mở bảng phân tầng 19 zones và click để camera lướt tới hạch nơ-ron tương ứng.
