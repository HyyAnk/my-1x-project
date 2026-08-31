# Prompt for a Fresh Coding Task: Implement Phase 8B

Copy the prompt below into a new coding-agent task opened in this repository after Phase 8A is complete.

---

Bạn đang triển khai Phase 8B — Boundary Integration Tests của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là tạo bằng chứng kiểm thử deterministic đi xuyên đúng các boundary production đã từng làm mất hoặc resolve lại style data. Đây là giai đoạn kiểm thử và hardening contract; không triển khai visual matrix, CSS parity cleanup hoặc cleanup kiến trúc của 8C/8D.

Trước khi sửa file:

1. Đọc root `AGENTS.md` và tuân thủ toàn bộ quy tắc kiến trúc, verification và bảo toàn working tree.
2. Đọc `docs/quiz-visual-refactor/README.md`, `phase-execution-protocol.md`, `roadmap-status.md`, `target-architecture.md`, `verification-runbook.md`, ADR-001/003/004, `phases/phase-08-end-to-end-stabilization.md`, `phases/phase-08-test-matrix.md`, handoff Phase 7 và `handoffs/phase-08a-2026-08-31.md`.
3. Chỉ tiếp tục nếu 8A là `COMPLETE`, 8B là `READY`, và không có agent khác đang triển khai cùng working tree. Nếu dependency gate sai, dừng và báo bằng chứng; không tự sửa roadmap để vượt gate.
4. Ghi branch, HEAD và toàn bộ `git status --short`. Working tree chứa thay đổi tích lũy chưa commit; không stage, commit, revert, xóa hoặc hấp thụ thay đổi ngoài scope.
5. Nếu `.codegraph/` tồn tại, dùng CodeGraph trước khi grep/đọc trực tiếp để trace `videoRunner → HyperframesRenderer → Composition`, style resolver/provenance, Channel update, Episode persistence/invalidation và preview request. Nếu công cụ CodeGraph không khả dụng, dùng symbol search/`rg` tương đương và ghi rõ trong handoff.
6. Ánh xạ trước từng case `P8B-*` sang test hiện có hoặc test sẽ bổ sung. Không coi string assertion ở lớp cuối là bằng chứng cho một boundary trung gian.

Hãy triển khai toàn bộ Phase 8B. Ưu tiên test qua public hoặc production-adjacent entry point, với fixture local và dependency seam nhỏ, thay vì mock bỏ qua chính layer cần kiểm tra. Test phải chứng minh style context không bị mất, không bị collapse Channel/Episode, không bị resolve lần hai và không phụ thuộc provider/network thật.

Nếu test mới chứng minh còn defect thuộc contract 8A, được phép sửa production tối thiểu tại đúng boundary và thêm regression tương ứng. Không mở rộng sang refactor semantic background, selected CSS bundling, browser visual matrix, legacy adapter cleanup, module splitting hoặc tính năng mới.

Success criteria:

- Tất cả case `P8B-BND-01` đến `P8B-BND-08` trong `phases/phase-08-test-matrix.md` có bằng chứng executable rõ ràng và pass.
- Có test thực đi qua chuỗi production, ma trận `Theme < Channel < Episode < Beat`, `auto`/missing legacy, transition next resolved palette, Channel persistence round-trip, Episode inheritance/invalidation và preview/production resolved-style parity.
- Test không gọi external provider, không nondeterministic và không thể pass bằng cách bypass layer đang được kiểm tra.
- Chạy targeted suites sau từng thay đổi, sau đó chạy `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm audit:quiz-choices`, Prettier dossier và `git diff --check`.
- Rerun production-adjacent workflow đã cập nhật; không chỉ dựa vào compile thành công.
- Tạo handoff có ngày `handoffs/phase-08b-YYYY-MM-DD.md`, cập nhật dossier/roadmap theo sự thật, mark 8B `COMPLETE` và chỉ mở 8C thành `READY` khi mọi gate đạt.

Nếu cần breaking migration, external service, thay đổi visual architecture của 8C, hoặc ghi đè dirty path không thể bảo toàn, hãy dừng và báo blocker thay vì hạ tiêu chuẩn.

Final report phải nêu outcome, boundary coverage theo từng `P8B-*`, production fixes nếu có, files thay đổi, exact commands/results, unrelated paths được giữ nguyên, rủi ro còn lại và trạng thái readiness của 8C. Không tự commit nếu người dùng chưa yêu cầu rõ.

---
