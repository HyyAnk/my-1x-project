# Prompt for a Fresh Coding Task: Implement Phase 8C

Copy the prompt below into a new coding-agent task opened in this repository only after Phase 8B is complete.

---

Bạn đang triển khai Phase 8C — Production/Sandbox Parity and Visual Evidence của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là đồng nhất semantic background contract giữa production và Visual Sandbox, chỉ bundle CSS của background thực sự được composition sử dụng, và thay các kết luận visual dựa trên string bằng bằng chứng browser/render đã được kiểm tra thực tế.

Trước khi sửa file:

1. Đọc root `AGENTS.md`, đặc biệt interaction plan, async feedback/state synchronization, responsive/mobile, accessibility, exact footer credit và post-update verification.
2. Đọc dossier README, protocol, roadmap, target architecture, compatibility matrix, verification runbook, ADR-003/004, `phases/phase-08-end-to-end-stabilization.md`, `phases/phase-08-test-matrix.md`, handoff 8A và handoff 8B mới nhất.
3. Chỉ tiếp tục nếu 8B `COMPLETE`, 8C `READY` và handoff 8B xác nhận toàn bộ `P8B-*` pass. Với 8C `IN_PROGRESS`, chỉ resume từ handoff `PARTIAL` mới nhất và khi không còn agent cạnh tranh.
4. Ghi branch, HEAD, `git status --short`; bảo toàn toàn bộ dirty path không thuộc scope. Không stage/commit/revert/delete nếu chưa được ủy quyền.
5. Dùng CodeGraph trước để trace shared scene parts, background registry/renderer, CSS assembly, production bundle, Sandbox composition, preview async lifecycle và browser entry points. Nếu CodeGraph không khả dụng, dùng symbol search tương đương và ghi lại.
6. Viết một interaction/verification plan ngắn trước implementation: primary flow, pending/success/error/retry/rapid-change state, refresh strategy, stale-response behavior, desktop/mobile, keyboard/touch và reduced motion.

Hãy triển khai end-to-end nhưng giữ scope hẹp. Production và Sandbox phải phát ra cùng canonical semantic background layer cho input tương đương. CSS assembler phải nhận tập variant thực sự được dùng, include mỗi variant đúng một lần và không include variant không dùng hoặc legacy block trùng. Không đổi palette, layout, foreground motion hay choice skin ownership.

Tạo artifact matrix có manifest reviewable trong `docs/quiz-visual-refactor/artifacts/phase-08c/`. Ma trận phải bao phủ cả bốn layout × hai aspect ratio × hai background; phân bổ representative Answer Card skins, mascot on/off, text dài và visual choices mà không cần nhân thành một Cartesian product vô ích. Mỗi artifact phải ghi surface, input/style IDs, viewport/aspect, mascot state, output path và kết quả inspect. Không đánh PASS chỉ vì HTML/CSS chứa đúng chuỗi.

Chạy ứng dụng thật và dùng Playwright/CDP/WebDriver hoặc browser protocol tương đương; tuyệt đối không dùng OS-level mouse/keyboard. Kiểm tra desktop/mobile, keyboard/focus/touch, success, slow, error, retry và rapid selection/latest-request-wins. Xác nhận mọi affected view tự đồng bộ không cần F5, copy ngắn gọn và footer responsive xuất hiện đúng một phiên bản.

Success criteria:

- Toàn bộ `P8C-PAR-*`, `P8C-VIS-*`, `P8C-UI-01`, `P8C-ASY-01`, `P8C-A11Y-01` và `P8C-E2E-01` pass với bằng chứng executable/visual đúng loại.
- Production/Sandbox semantic background parity và selected-only CSS bundling có regression tests deterministic.
- Artifact matrix và manifest được inspect thực tế; không có occlusion, overflow, stale preview, stuck loader hoặc reduced-motion regression quan trọng.
- Không thêm layout/background/skin/choice count, không broad redesign và không làm cleanup 8D sớm trừ khi cần thiết để tạo parity đúng boundary.
- Chạy targeted tests, workspace format/lint/type/test/build, E2E, quiz audit, dossier formatting và `git diff --check`; restart/rebuild rồi rerun primary browser and production-render workflows.
- Tạo `handoffs/phase-08c-YYYY-MM-DD.md`, cập nhật dossier/roadmap; chỉ mark 8C `COMPLETE` và 8D `READY` khi mọi evidence đã review.

Nếu không thể tạo browser/render evidence thật, selected-only CSS đòi breaking registry contract ngoài scope, hoặc dirty changes chồng lấn không thể bảo toàn, hãy ghi `PARTIAL`/`BLOCKED` đúng protocol; không dùng string assertion để thay thế.

Final report phải nêu outcome, semantic/CSS changes, matrix coverage và artifact paths, browser states/viewport/accessibility evidence, commands/results, deviations, risks, unrelated paths preserved và readiness của 8D. Không tự commit nếu chưa được yêu cầu rõ.

---
