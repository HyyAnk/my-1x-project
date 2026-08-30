# Prompt for a Fresh Codex Task: Implement Phase 3

Copy the prompt below into a new Codex task opened for this repository only after Phase 2 is complete.

---

Bạn đang triển khai Phase 3 — Shared Scene Pipeline của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là tạo một normalized quiz scene model và một shared semantic scene-part builder được cả production composition và Sandbox preview sử dụng, trong khi giữ nguyên timeline, layout slots, choice renderers, styles và output quan sát được của Phase 2.

Trước khi sửa file:

1. Đọc root `AGENTS.md`, dossier README và `phase-execution-protocol.md`.
2. Đọc roadmap, target architecture, accepted ADRs, current As-Is/source inventory, verification runbook, `phases/phase-03-shared-scene-pipeline.md` và `phases/phase-03-test-matrix.md`.
3. Đọc handoff Phase 2 có ngày mới nhất. Chỉ tiếp tục khi Phase 2 `COMPLETE`, Phase 3 `READY` và capability contract ổn định; khi resume Phase 3, chấp nhận `IN_PROGRESS` chỉ với handoff Phase 3 `PARTIAL` mới nhất và không có task khác đang chạy. Nếu gate không đạt, không triển khai.
4. Ghi nhận branch, HEAD và `git status --short`; bảo toàn mọi thay đổi ngoài scope.
5. Dùng CodeGraph trước khi grep/read nếu `.codegraph/` tồn tại để xác minh production/Sandbox entry points, state mapping, asset/style inputs và callers.

Hãy triển khai end-to-end. Tách model types, pure state adapters, shared part construction và surface adapters thành các module cohesive. Production timeline và Sandbox simulated phase vẫn là hai adapter riêng nhưng phải tạo cùng scene-state contract. Tạm giữ current text/visual renderer và split slots qua một adapter nhỏ có Phase 4 removal condition; giữ legacy background qua một adapter có Phase 7 owner.

Success criteria:

- Mọi case bắt buộc trong `phases/phase-03-test-matrix.md` pass.
- Production và Sandbox thực sự gọi chung scene model builder và semantic part builder; không xuất hiện path thứ ba chứa duplicate logic.
- Layout compatibility result từ Phase 2 không bị resolve lại ở downstream.
- Question, phase, canonical answer state, assets, aspect ratio và mascot occupancy có model explicit, deterministic.
- Không unified choice renderer/slots, CSS/preset refactor, layout mới, background registry hoặc four-choice trong phase này.
- Existing Phase 1–2 contracts, targeted tests và workspace gates pass; primary Sandbox/production workflows được chạy lại.
- Handoff Phase 3, dossier và roadmap phản ánh kết quả thật; chỉ mark Phase 4 `READY` khi exit gate đạt.

Nếu việc share pipeline yêu cầu thay đổi timeline contract, giấu surface behavior trong core model, hoặc ghi đè thay đổi có sẵn, hãy dừng và báo blocker thay vì tạo abstraction sai.

Final report phải dẫn outcome, modules/entry points đã migrate, parity evidence theo case ID, commands/results, adapters và removal owners, production behavior, unrelated changes, risks và Phase 4 readiness.

---
