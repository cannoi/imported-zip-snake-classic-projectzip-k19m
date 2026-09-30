# Snake Arcade — Hướng dẫn nhanh (không cần biết lập trình)

## 1. Bật game (trên máy Windows dùng làm "máy chủ")
- Cài **Docker Desktop** (hoặc **Node.js LTS**), rồi **nhấp đúp `start-windows.bat`**.
- Cửa sổ sẽ in ra các đường dẫn dạng `http://192.168.1.23:8080`. Đó là địa chỉ để mọi người vào chơi.
- Muốn xem lại địa chỉ: nhấp đúp `show-ip-windows.bat`.

## 2. Tự xem IP trên Windows (nếu không dùng file .bat)
1. Bấm phím **Windows**, gõ **cmd**, nhấn Enter.
2. Gõ **ipconfig**, nhấn Enter.
3. Tìm dòng **IPv4 Address** (ví dụ `192.168.1.23`).
4. Đường dẫn là `http://192.168.1.23:8080`.

## 3. Vào chơi
- Điện thoại, máy tính, TV **cùng Wi-Fi** → mở trình duyệt → nhập đường dẫn. Không cần cài gì.
- Người đầu tiên bấm **Tạo phòng nhiều người**, những người khác chạm vào phòng trong danh sách (hoặc nhập mã 4 chữ).
- Thiếu người? Bấm **+ BOT**. Chơi một mình: **Chơi nhanh**.

## 4. Gặp lỗi?
- Không vào được: cùng Wi-Fi chưa? Windows Firewall hỏi thì chọn **Private networks**. Chọn địa chỉ 192.168.x.x hoặc 10.x.x.x.
- Nút ⚙ (góc phải trên) mở cài đặt: đổi tên/màu/skin, xem phòng, sao chép link mời, tạm dừng (khi chơi một mình), rời phòng.
- Dừng game: `docker compose down` (hoặc đóng cửa sổ đen).

## 5. Trọng tài AI và chat (bản 2.7)
- Bấm nút **AI** ở góc dưới bên phải. Nếu chưa có token, game sẽ hỏi: chọn nhà cung cấp (OpenAI, DeepSeek, Gemini…), dán token, bấm **LƯU & THỬ**. Token chỉ lưu trên máy chủ game, không hiện lại. Bấm **HỦY** vẫn dùng được trọng tài nội bộ (báo điểm, người thắng).
- Trên Wi-Fi dùng chung, nên đặt `AI_ADMIN_PIN` trong `.env` để người khác không đổi được token.
- **Chat**: bấm 💬 (hoặc phím Enter) để nhắn cho cả phòng khi đang chơi; chạm biểu tượng cảm xúc để hiện bong bóng trên đầu rắn; gõ `@ai câu hỏi` để hỏi trọng tài.
- **Màn mới**: gai đỏ (chết), bùn nâu (chậm), mũi tên xanh (tăng tốc), cổng vàng đóng/mở mỗi 4 giây.
