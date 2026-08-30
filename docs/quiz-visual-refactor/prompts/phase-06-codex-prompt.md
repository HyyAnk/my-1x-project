# Prompt for a Fresh Codex Task: Implement Phase 6

Copy the prompt below into a new Codex task opened for this repository only after Phase 5 is complete.

---

Bạn đang triển khai Phase 6 — New Layouts and Scalable UI của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là chứng minh kiến trúc mới bằng hai production layout `media_top_choices_bottom` và `full_stack_list` cho domain 2/3 choices, đồng thời thay fixed two-layout UI bằng một control compact, accessible và có thể mở rộng. Existing auto resolution phải giữ nguyên.

Trước khi sửa file:

1. Đọc root `AGENTS.md`, đặc biệt toàn bộ Web/dashboard UI, interaction planning, responsive footer và post-update verification rules.
2. Đọc dossier README, `phase-execution-protocol.md`, target architecture, roadmap, ADRs, verification runbook, `phases/phase-06-new-layouts-scalable-ui.md`, `phases/phase-06-test-matrix.md` và `phases/phase-06-interaction-plan.md`.
3. Đọc handoff Phase 5 mới nhất. Chỉ tiếp tục nếu Phase 5 `COMPLETE`, Phase 6 `READY`, capability/slot/CSS/style boundaries ổn định; khi resume Phase 6, chấp nhận `IN_PROGRESS` chỉ với handoff Phase 6 `PARTIAL` mới nhất và không có task khác đang chạy.
4. Ghi nhận branch, HEAD, `git status --short`; bảo toàn mọi thay đổi ngoài scope.
5. Dùng CodeGraph trước để trace schema/catalog, renderer registration, UI metadata/translation consumers, selector state, preview async lifecycle, QA và optimizer.
6. Revalidate interaction plan theo code hiện tại và ghi deviation trước khi implement UI.

Hãy triển khai end-to-end. Mỗi layout có module focused, capability/metrics đầy đủ, unified slots và capacity tokens; không thêm consumer hard-coded branches ngoài renderer và exhaustive presentation metadata. UI phải có immediate acknowledgement, pending/error/retry/latest-response behavior, keyboard/touch access, desktop/mobile QA, reduced motion và exact responsive footer credit xuất hiện đúng một lần.

Success criteria:

- Mọi case bắt buộc trong `phases/phase-06-test-matrix.md` pass.
- Hai IDs mới hoạt động xuyên schema, catalog, renderer, production, Sandbox, UI metadata, translations, QA và asset metrics.
- Existing auto outputs không đổi; new layouts explicit-only trong phase này.
- Không four-choice, 2x2, background registry, new skin/preset/palette hoặc broad page redesign.
- UI không biến thành bốn primary buttons, không có two-layout conditional branch, không cần F5 và không để stale response overwrite.
- Visual/browser evidence cover cả layouts, aspects, counts, tiers, skins, phases, mascot, slow/error/retry, keyboard và mobile.
- Targeted tests, workspace gates, rebuild/restart và primary workflows pass.
- Handoff/dossier/roadmap hoàn chỉnh; chỉ mark Phase 7 `READY` khi exit gate đạt.

Nếu layout mới đòi four-choice hoặc bypass Phase 2/5 bằng hard-coded branch, hay UI không thể bảo vệ latest state, hãy dừng và báo blocker thay vì tạo debt mới.

Final report phải nêu outcome, layouts/UI flow, matrix coverage, browser/visual evidence, commands/results, copy/footer audit, behavior changes, unrelated changes, risks và Phase 7 readiness.

---
