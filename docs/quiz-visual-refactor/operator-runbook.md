# Hướng dẫn vận hành tuần tự Quiz Visual Refactor

Tài liệu này dành cho người giao việc cho các coding task mới. Core Phase 1–7 và stabilization Phase 8 đã hoàn tất; hiện không còn phase `READY`. Các prompt bên dưới là hồ sơ lịch sử và chỉ được dùng lại khi roadmap mới hoặc handoff mới mở lại rõ ràng một phase. Không chạy hai phase song song trên cùng working tree.

## Trước khi giao một phase

1. Mở `roadmap-status.md` và kiểm tra phase sắp chạy có trạng thái `READY`. Khi tiếp tục chính phase đang dở, chấp nhận `IN_PROGRESS` chỉ khi handoff mới nhất của phase đó là `PARTIAL` và không có agent khác còn chạy.
2. Với Phase 2 trở đi, kiểm tra phase liền trước là `COMPLETE` và có handoff thực tế trong `handoffs/`, không chỉ có template.
3. Kiểm tra handoff nói rõ phase kế tiếp đã `READY`, mọi verification bắt buộc đã pass và không còn blocker chuyển tiếp.
4. Tạo task Codex mới trong đúng repository này rồi dán nguyên văn prompt tương ứng trong `prompts/`.
5. Không tự ghép thêm toàn bộ source hoặc chat cũ vào prompt. Agent sẽ đọc dossier, handoff và source hiện tại.

## Sau khi agent kết thúc

Chỉ chuyển sang phase kế tiếp khi tất cả điều sau đều đúng:

- final report nói rõ phase đã `COMPLETE`;
- `roadmap-status.md` đã phản ánh trạng thái thật;
- có handoff có ngày cho phase vừa chạy;
- handoff ánh xạ đầy đủ case ID trong test matrix;
- các lệnh verification bắt buộc có kết quả cụ thể;
- diff không chứa thay đổi ngoài phạm vi hoặc file người dùng bị ghi đè;
- phase kế tiếp được đánh dấu `READY`.

Nếu phase kết thúc ở `PARTIAL`, không dùng prompt phase tiếp theo. Hãy mở task mới bằng lại prompt của chính phase đang dở và yêu cầu agent đọc handoff mới nhất để tiếp tục. Nếu phase là `BLOCKED`, trước tiên phải giải quyết điều kiện blocker hoặc cấp authority còn thiếu rồi mới resume.

## Thứ tự prompt

Chuỗi prompt 1–8D đã hoàn tất. Handoff closure hiện tại là `handoffs/phase-08d-2026-08-31.md`; four-choice vẫn là project riêng `DEFERRED` và không được khởi động từ các prompt này.

| Thứ tự | Prompt                              | Chỉ chạy khi        |
| ------ | ----------------------------------- | ------------------- |
| 1      | `prompts/phase-01-codex-prompt.md`  | Dossier đã sẵn sàng |
| 2      | `prompts/phase-02-codex-prompt.md`  | Phase 1 COMPLETE    |
| 3      | `prompts/phase-03-codex-prompt.md`  | Phase 2 COMPLETE    |
| 4      | `prompts/phase-04-codex-prompt.md`  | Phase 3 COMPLETE    |
| 5      | `prompts/phase-05-codex-prompt.md`  | Phase 4 COMPLETE    |
| 6      | `prompts/phase-06-codex-prompt.md`  | Phase 5 COMPLETE    |
| 7      | `prompts/phase-07-codex-prompt.md`  | Phase 6 COMPLETE    |
| 8      | Phase 8A đã triển khai, không rerun | Phase 7 COMPLETE    |
| 9      | `prompts/phase-08b-codex-prompt.md` | Phase 8A COMPLETE   |
| 10     | `prompts/phase-08c-codex-prompt.md` | Phase 8B COMPLETE   |
| 11     | `prompts/phase-08d-codex-prompt.md` | Phase 8C COMPLETE   |

## Quy tắc working tree

- Mỗi agent phải chạy `git status` trước khi sửa.
- Không tự động commit, stage, revert hoặc xóa thay đổi nếu người dùng chưa yêu cầu.
- Danh sách dirty path trong dossier chỉ là snapshot; trạng thái tại lúc agent bắt đầu mới là authoritative.
- Nếu thay đổi có sẵn chồng lấn file bắt buộc của phase, agent phải bảo toàn dữ liệu và báo blocker thay vì ghi đè.

## Khi kế hoạch và code khác nhau

Code, tests và handoff mới nhất có độ ưu tiên cao hơn dự đoán trong brief tương lai. Agent được phép điều chỉnh file hoặc tên abstraction để phù hợp kiến trúc đã hình thành, nhưng không được đổi outcome, mở rộng scope hoặc bỏ acceptance case. Mọi deviation quan trọng phải được ghi trong handoff và cập nhật dossier.
