# Universal AI + Feedback Modules for Pi SoloHost

Tách từ `Futuristic Calculator AI v1.3.0` và chuẩn hóa thành bộ module dùng chung cho nhiều app.

## Có gì trong ZIP?

- `ai-module/` — AI Gateway + Settings + Logs + client helper
- `feedback-module/` — Feedback Hub server proxy + client helper
- `INTEGRATION_GUIDE.md` — hướng dẫn tích hợp chi tiết cho AI code
- `SECURITY.md` — quy tắc bảo mật
- `example/` — ví dụ App Adapter
- `tests/` — kiểm tra cấu trúc/module

## Nguyên tắc

**Một app = một AI + một Feedback + một AI button.**

Module không được làm thay đổi UI/business logic của app chủ.
