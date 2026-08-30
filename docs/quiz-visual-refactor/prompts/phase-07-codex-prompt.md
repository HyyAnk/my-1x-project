# Prompt for a Fresh Codex Task: Implement Phase 7

Copy the prompt below into a new Codex task opened for this repository only after Phase 6 is complete.

---

Bạn đang triển khai Phase 7 — Background Variant Registry của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là tạo một typed background registry dùng chung cho production và Sandbox, extract background hiện tại thành compatibility default `candy_rays`, thêm đúng một proof animated variant deterministic/lightweight, và tích hợp background selection vào style/preset/UI flow mà không coupling với layout, palette storage, foreground motion hay choice skin.

Trước khi sửa file:

1. Đọc root `AGENTS.md`, gồm UI interaction, responsive footer, async synchronization và post-update verification.
2. Đọc dossier README, `phase-execution-protocol.md`, target architecture, roadmap, ADR-004, verification runbook, `phases/phase-07-background-registry.md`, `phases/phase-07-test-matrix.md` và `phases/phase-07-interaction-plan.md`.
3. Đọc handoff Phase 6 mới nhất. Chỉ tiếp tục nếu Phase 6 `COMPLETE`, Phase 7 `READY` và shared scene/style/UI boundaries ổn định; khi resume Phase 7, chấp nhận `IN_PROGRESS` chỉ với handoff Phase 7 `PARTIAL` mới nhất và không có task khác đang chạy.
4. Ghi nhận branch, HEAD, `git status --short`; không chạm dirty paths ngoài scope.
5. Dùng CodeGraph trước để trace current production/Sandbox background markup/CSS, scene builder, presets/config/API/render inputs, CSS assembly, reduced motion và preview lifecycle.
6. Revalidate interaction plan; chọn một proof variant ID ngắn, nhất quán với naming hiện tại và ghi rationale trong handoff.

Hãy triển khai end-to-end. Existing records thiếu field mới phải parse và resolve về `candy_rays`. Registry variant sở hữu deterministic HTML/CSS, scoped selectors, static reduced-motion fallback và performance metadata. Dùng stable seed, không `Math.random()`, không WebGL/dependency mới và không thêm nhiều effect ngoài một proof variant.

Success criteria:

- Mọi case bắt buộc trong `phases/phase-07-test-matrix.md` pass.
- Một registry/renderer duy nhất phục vụ production và Sandbox; duplicate legacy background blocks bị xóa.
- `auto`, legacy missing field, explicit selection và preset resolution đều deterministic; preset không đổi production layout.
- `candy_rays` giữ visible compatibility; proof variant selectable end-to-end, palette-driven, bounded và có static reduced-motion state.
- UI reuse scalable control/async contract, không F5, không stale overwrite, keyboard/touch/mobile accessible và footer đúng một lần.
- Không thêm layout, choice count/format, skin, palette system, foreground motion/transition refactor hoặc four-choice.
- Registry/resolver/render/UI tests, performance evidence, workspace gates, rebuild/restart và production/Sandbox/browser workflows pass.
- Handoff/dossier/roadmap hoàn chỉnh; mark core 7-phase refactor complete nhưng giữ four-choice project `DEFERRED`.

Nếu field mới cần breaking migration, effect không deterministic/reduced-motion/performance-safe, hoặc background chỉ hoạt động bằng layout-specific selectors, hãy dừng và báo blocker thay vì hạ tiêu chuẩn.

Final report phải nêu outcome, chosen proof ID/rationale, registry/config/UI integration, matrix coverage, determinism/performance/visual evidence, commands/results, compatibility, unrelated changes, risks và trạng thái hoàn tất roadmap.

---
