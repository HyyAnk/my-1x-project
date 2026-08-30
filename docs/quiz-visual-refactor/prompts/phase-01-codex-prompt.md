# Prompt for a Fresh Codex Task: Implement Phase 1

Copy the prompt below into a new Codex task opened for this repository.

---

Bạn đang triển khai Phase 1 — Characterization Baseline của kế hoạch Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là tạo bằng chứng kiểm thử deterministic cho hành vi hiện tại của layout, choice renderer, element skins, phase, aspect ratio, mascot và preview synchronization. Không thực hiện refactor production và không thay đổi hành vi hiển thị có chủ đích trong phase này.

Trước khi sửa file:

1. Đọc AGENTS.md ở repository root và `docs/quiz-visual-refactor/phase-execution-protocol.md`.
2. Đọc theo thứ tự:
   - docs/quiz-visual-refactor/README.md
   - docs/quiz-visual-refactor/roadmap-status.md
   - docs/quiz-visual-refactor/as-is-system-map.md
   - docs/quiz-visual-refactor/source-inventory.md
   - docs/quiz-visual-refactor/compatibility-matrix.md
   - docs/quiz-visual-refactor/target-architecture.md
   - toàn bộ ADR trong docs/quiz-visual-refactor/decisions/
   - docs/quiz-visual-refactor/phases/phase-01-baseline.md
   - docs/quiz-visual-refactor/phases/phase-01-test-matrix.md
   - docs/quiz-visual-refactor/verification-runbook.md
3. Chạy git status và ghi nhận branch, HEAD cùng mọi thay đổi có sẵn. Không sửa, revert, stage hoặc gộp các thay đổi không thuộc Phase 1.
4. Nếu .codegraph tồn tại, dùng CodeGraph trước để xác minh các symbol và call path được nêu trong tài liệu. Tài liệu là bản đồ điều hướng; code và tests hiện tại mới là source of truth.

Success criteria:

- Mọi case MUST_AUTOMATE trong phase-01-test-matrix.md có test deterministic đang pass.
- Mọi case VERIFY_EXISTING được ánh xạ tới test hiện có hoặc được bổ sung nếu evidence chưa đủ rõ.
- Mọi case RECORD_ONLY có evidence chính xác trong handoff và lý do không biến thành invariant test.
- Không thêm layout, không đổi schema choice count, không hợp nhất renderer, không refactor CSS/preset/background và không redesign UI.
- Targeted tests và toàn bộ workspace gates trong verification runbook đều pass.
- Không có intentional production behavior change.
- Một handoff Phase 1 có ngày được tạo từ template; roadmap-status.md và dossier được cập nhật bằng kết quả thật.

Hãy mở đầu bằng một cập nhật ngắn về phạm vi và bước kiểm tra đầu tiên, sau đó tự thực hiện Phase 1 end-to-end. Nếu một test bắt buộc chỉ có thể thực hiện bằng material production refactor, hoặc thay đổi sẵn có của người dùng chồng lấn với file bắt buộc, hãy dừng phần đó, giữ nguyên dữ liệu người dùng và báo blocker cụ thể thay vì mở rộng scope.

Khi hoàn thành, trả lời outcome trước; liệt kê files/tests đã thay đổi, coverage theo case ID, commands và kết quả, xác nhận production behavior, thay đổi không liên quan đã được giữ nguyên, rủi ro còn lại và Phase 2 đã READY hay chưa.

---
