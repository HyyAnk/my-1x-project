# Prompt for a Fresh Codex Task: Implement Phase 4

Copy the prompt below into a new Codex task opened for this repository only after Phase 3 is complete.

---

Bạn đang triển khai Phase 4 — Unified Choice Rendering của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là thay production/Sandbox text và visual choice paths bằng một semantic choice-group renderer, migrate mọi Answer Card skin để hỗ trợ cả text lẫn visual content, và thay split layout slots bằng một `choicesHtml` slot. Four-choice vẫn bị cấm.

Trước khi sửa file:

1. Đọc root `AGENTS.md`, dossier README, `phase-execution-protocol.md`, target architecture và ADR-002/ADR-003.
2. Đọc roadmap, compatibility matrix, verification runbook, `phases/phase-04-unified-choice-rendering.md` và `phases/phase-04-test-matrix.md`.
3. Đọc handoff Phase 3 mới nhất và chỉ tiếp tục nếu Phase 3 `COMPLETE`, Phase 4 `READY`, shared scene model cùng temporary adapters đã rõ; khi resume Phase 4, chấp nhận `IN_PROGRESS` chỉ với handoff Phase 4 `PARTIAL` mới nhất và không có task khác đang chạy.
4. Ghi nhận branch, HEAD, `git status --short`; không stage/revert/ghi đè thay đổi ngoài Phase 4.
5. Dùng CodeGraph trước để trace scene builder, current choice paths, Answer Card registry/variants, layout slots và tests.

Hãy triển khai Phase 4 end-to-end. Correctness phải theo canonical choice ID; group renderer sở hữu ordering, labels, states, escaping, tiers và media fallback. Skin chỉ sở hữu visual hooks/decorations. Migrate cả production và Sandbox, baseline và mọi production layout, rồi xóa old dual renderers và split-slot adapters khi caller cuối cùng đã chuyển.

Success criteria:

- Mọi case bắt buộc trong `phases/phase-04-test-matrix.md` pass.
- Chỉ còn một semantic choice renderer và một active `choicesHtml` slot contract.
- Tất cả registered skins render được text và visual choices; visual choices thực sự nhận selected skin.
- Missing media có fallback không vỡ, phases/correctness/escaping/tiers nhất quán giữa surfaces.
- Current 2/3-choice schema giữ nguyên; không layout/style/background/preset mới và không broad CSS rewrite của Phase 5.
- Mọi intentional visual diff được inspect, không blind snapshot update.
- Targeted tests, workspace gates và production/Sandbox visual workflows ở 16:9/9:16 pass.
- Handoff/dossier/roadmap hoàn chỉnh; chỉ mark Phase 5 `READY` khi cả renderer lẫn caller/slot migration đã xong.

Nếu một skin buộc phải sở hữu lại workflow logic, Phase 3 model thiếu canonical data, hoặc external consumer chưa thể migrate an toàn, hãy dừng và ghi blocker/removal path rõ ràng.

Final report phải nêu outcome, old paths đã xóa, contract/skins/layouts đã migrate, matrix coverage, visual evidence, commands/results, intended behavior changes, unrelated changes, risks và Phase 5 readiness.

---
