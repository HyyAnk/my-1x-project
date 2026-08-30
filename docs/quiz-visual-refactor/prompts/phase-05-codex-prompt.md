# Prompt for a Fresh Codex Task: Implement Phase 5

Copy the prompt below into a new Codex task opened for this repository only after Phase 4 is complete.

---

Bạn đang triển khai Phase 5 — CSS Ownership and Preset Resolution của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là thiết lập boundary thật giữa layout/base/state/typography/skin/token CSS, đồng thời dùng một pure style-resolution và palette-serialization policy chung cho production và preview. Visual preset không được quyết định production layout.

Trước khi sửa file:

1. Đọc root `AGENTS.md`, dossier README, `phase-execution-protocol.md`, target architecture và ADR-001/ADR-003.
2. Đọc roadmap, current As-Is/source inventory, verification runbook, `phases/phase-05-css-preset-boundaries.md` và `phases/phase-05-test-matrix.md`.
3. Đọc handoff Phase 4 mới nhất. Chỉ tiếp tục nếu Phase 4 `COMPLETE`, Phase 5 `READY`, unified markup/slot ổn định và không còn dual choice path; khi resume Phase 5, chấp nhận `IN_PROGRESS` chỉ với handoff Phase 5 `PARTIAL` mới nhất và không có task khác đang chạy.
4. Ghi nhận branch, HEAD, `git status --short`; giữ nguyên dirty paths ngoài scope.
5. Dùng CodeGraph trước để trace layout CSS, base/state/tier rules, variant CSS assembly, palette variables, server defaults, web/channel/episode/preset resolution và preview requests.

Hãy triển khai end-to-end theo boundary trong brief. Dùng capacity tokens có owner/fallback rõ ràng; normal cascade không dựa vào `!important`; centralize palette variables và style precedence; preserve `auto`, legacy presets và ADR-001. Deduplicate required CSS trong composition thay vì copy logic sang một god file mới.

Success criteria:

- Mọi case bắt buộc trong `phases/phase-05-test-matrix.md` pass.
- Layout không target private skin structure/decorative properties; skin không điều khiển outer layout geometry.
- Base/state/typography CSS có một owner và dùng stable markup từ Phase 4.
- Production/Sandbox resolve cùng style IDs và semantic palette variables từ cùng inputs.
- Preset showcase layout không thay production layout; legacy data vẫn parse/resolve qua adapter có removal condition.
- Không thêm layout, skin, palette, background, four-choice hoặc broad UI redesign.
- Visual pairwise evidence ở 16:9/9:16, mascot on/off, phases và skins được inspect.
- Targeted checks, workspace gates và rebuilt primary workflows pass.
- Handoff/dossier/roadmap hoàn chỉnh; chỉ Phase 6 được mark `READY` cho chuỗi thực thi tuần tự.

Nếu persisted config không phân biệt được inherited và explicit values mà cần breaking migration, hoặc ownership change phá markup contract chưa được Phase 4 migrate, hãy dừng và báo blocker cụ thể.

Final report phải nêu outcome, CSS owners/modules, resolution precedence/provenance, adapters, matrix/visual evidence, commands/results, behavior differences, unrelated changes, risks và Phase 6 readiness.

---
