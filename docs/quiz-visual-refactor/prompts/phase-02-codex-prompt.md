# Prompt for a Fresh Codex Task: Implement Phase 2

Copy the prompt below into a new Codex task opened for this repository only after Phase 1 is complete.

---

Bạn đang triển khai Phase 2 — Layout Capability Contract của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là biến layout catalog thành một policy typed và executable duy nhất cho compatibility, resolution, render/asset metrics, Director validation, QA, optimizer, Sandbox và web metadata. Không thêm layout mới trong phase này.

Trước khi sửa file:

1. Đọc root `AGENTS.md` và `docs/quiz-visual-refactor/phase-execution-protocol.md`.
2. Đọc dossier README, roadmap, As-Is map, source inventory, compatibility matrix, target architecture, toàn bộ ADR, verification runbook, `phases/phase-02-layout-capability-contract.md` và `phases/phase-02-test-matrix.md`.
3. Tìm handoff Phase 1 có ngày mới nhất trong `handoffs/`, không dùng template. Chỉ tiếp tục nếu Phase 1 `COMPLETE` và Phase 2 `READY`; khi resume Phase 2, chấp nhận `IN_PROGRESS` chỉ với handoff Phase 2 `PARTIAL` mới nhất và không có task triển khai khác đang chạy. Nếu gate không đạt, báo chính xác evidence và không triển khai.
4. Ghi nhận branch, HEAD và toàn bộ `git status --short`. Không sửa, revert, stage hoặc gộp thay đổi không thuộc Phase 2.
5. Nếu `.codegraph/` tồn tại, dùng CodeGraph trước để xác minh symbols, callers và blast radius. Code/tests/handoff mới nhất là source of truth; cập nhật tài liệu nếu snapshot cũ sai.

Hãy triển khai Phase 2 end-to-end, không chỉ lập kế hoạch. Giữ pure capability policy trong `@studio/shared`, tách UI/runtime details khỏi shared contract, trả structured incompatibility cho explicit request không hợp lệ, giữ kết quả `auto` hiện tại và bảo toàn persisted layout IDs. Migrate các consumer thực tế thay vì tạo một contract mới nhưng tiếp tục để branch cũ hoạt động song song.

Success criteria:

- Mọi case bắt buộc trong `phases/phase-02-test-matrix.md` có evidence đang pass.
- Một capability contract duy nhất sở hữu presentation, counts, formats, media/aspect support và metrics.
- Catalog, production IDs, renderer registry và UI metadata exhaustive.
- Director/QA/Sandbox/optimizer sử dụng policy mới; explicit incompatible không bị silent fallback.
- Baseline vẫn chỉ thuộc preview; không thêm layout, four-choice, scene/choice/CSS/preset/background refactor.
- Targeted tests và toàn bộ workspace gates trong runbook pass.
- Tạo handoff Phase 2 có ngày từ template, cập nhật dossier/roadmap theo kết quả thật và chỉ đánh dấu Phase 3 `READY` khi exit gate đạt.

Nếu enforcement có thể phá persisted artifact mà không có staged adapter an toàn, hoặc file bắt buộc chồng lấn thay đổi người dùng, hãy dừng phần đó và báo blocker cụ thể thay vì ghi đè hay mở rộng scope.

Khi hoàn thành, trả lời outcome trước; nêu contract/consumer đã migrate, coverage theo case ID, commands và kết quả, behavior changes, adapters còn lại cùng removal condition, unrelated changes đã giữ nguyên, rủi ro và Phase 3 readiness.

---
