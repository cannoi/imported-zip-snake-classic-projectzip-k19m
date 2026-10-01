# Snake Arcade 2.0 — Multiplayer LAN

## Chạy
```bash
docker compose up -d --build     # hoặc: npm install && npm start
docker compose ps                # cột STATUS phải là "healthy"
```
Mở `http://<IP-máy-chủ>:<PORT>` (PORT do SoloHost cấp; chạy `docker compose port app 8080` để xem) (xem IP: `ipconfig` / `ip a`). Dữ liệu kỷ lục lưu ở `./data/scores.json`.

## Kiểm thử LAN
1. Máy A: mở web → **Tạo phòng LAN** → ghi mã 4 ký tự.
2. Máy B (điện thoại/TV, cùng Wi-Fi): mở cùng URL → nhập mã → **Vào phòng**.
3. Máy A chọn chế độ + bản đồ → **Bắt đầu**. Đổi tên/màu/skin ở menu sẽ đồng bộ ngay.
4. Điều khiển: phím mũi tên/WASD (PC, remote TV), D-pad hoặc vuốt (cảm ứng).
5. Nếu máy khác không vào được: mở cổng public mà SoloHost/Docker đã cấp trên firewall.

## Kết nối & đa người chơi (bản 2.2)
- **Tự nối lại:** mỗi tab có một ID riêng. Mất Wi-Fi, khóa màn hình hay F5 giữa ván → tự vào lại đúng phòng, giữ rắn và điểm. Trong lúc offline (tối đa 60 giây, đổi bằng `GRACE_MS`) AI lái rắn giúp; quá hạn thì bị dọn khỏi phòng.
- **Chủ phòng offline** → quyền chủ phòng tự chuyển cho người còn online.
- **Danh sách phòng đang mở** ngay ở menu, chạm để vào, không cần gõ mã.
- **Vào giữa ván:** người mới hồi sinh sau 2 giây (Co-op/Đua/Màn chơi); Sinh tồn chỉ xem đến ván sau.
- **Chỉ số mạng** góc trên trái (ping ms, đang nối lại…). Giới hạn tốc độ thao tác, tối đa `MAX_ROOMS` phòng, `docker stop` tắt server êm (SIGTERM).
- Mở từ `localhost` sẽ hiện địa chỉ LAN để mời người thân. Chạy Docker: nên đặt `PUBLIC_URL` (server không thấy IP thật của máy chủ).

## Language & campaign (2.4)
- Default UI language is **English**. Switch to Vietnamese with the EN / VI buttons on the menu and in Settings (saved in the browser).
- Campaign mode has **12 named stages** (Open Field → Final Cross) with distinct wall/background colors. Lobby shows a stage list when Campaign is selected.
- Extra maps selectable in the lobby: Crossroads, The Arena, Highway, Islands.

## Tiện ích cơ bản (bản 2.3)
- Nút ⚙ (hoặc phím Esc) trong mọi màn hình: đổi tên/màu/skin ngay khi đang chơi, bật/tắt âm thanh và rung, xem phòng và danh sách người chơi, sao chép link mời, toàn màn hình, rời phòng.
- Đếm ngược 3-2-1 trước mỗi ván, rắn của bạn có dấu ★; **tạm dừng** (nút hoặc phím P) khi chơi một mình.
- Màn **Hướng dẫn chơi** (tự hiện lần đầu) và **Kết nối LAN** (cách lấy IP trên Windows/Mac/Linux, nút sao chép link).
- Cuối ván: 🏆 người thắng, **Chơi lại** (chủ phòng), Về phòng, Về menu. Mô tả từng chế độ ngay trong phòng.
- Windows: `start-windows.bat` (bật game) và `show-ip-windows.bat` (hiện địa chỉ LAN). Xem thêm `HUONG_DAN.md`.

## Chế độ & vật phẩm
- Co-op: chung 3 mạng, xuyên qua nhau. Sinh tồn: người sống sót cuối thắng, tường mọc thêm mỗi 10s. Đua thời gian: 90s, hồi sinh sau 3s.
- Bản đồ: Open (xuyên biên), Box, Mê cung, Portal. Vật phẩm: ✖2 (điểm & dài x2), ⚡ tăng tốc 8s, ❄️ đóng băng người khác 4s.

## v2.7 — AI referee, room chat, more stages
- **AI button** (bottom-right): opens the referee panel; without a token it asks for one (provider + token). See `AI_INTEGRATE.md`.
- **Chat**: 💬 (top-right) or Enter opens the chat bar during a game; tap an emote to show a bubble over your snake; `@ai <question>` asks the referee. Chat lines float over the board for a few seconds (turn off in Settings).
- **Stages/maps**: 25 maps + Random, 30 campaign stages. Legend: red triangle = spikes (deadly) · brown = mud (slows) · cyan chevron = boost pad · striped amber = gate that opens/closes every 4 s (dashed outline when open, red flash just before closing) · purple = portal.
