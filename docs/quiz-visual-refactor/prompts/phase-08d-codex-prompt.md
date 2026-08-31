# Prompt for a Fresh Coding Task: Implement Phase 8D

Copy the prompt below into a new coding-agent task opened in this repository only after Phase 8C is complete.

---

Bạn đang triển khai Phase 8D — Cleanup and Acceptance Closure của Quiz Visual Refactor trong repository hiện tại.

Mục tiêu là đóng Phase 8 bằng cách loại bỏ hoặc ràng buộc rõ các compatibility path cũ, đưa layout dimensions về một canonical owner, cải thiện cohesion chỉ ở nơi thực sự trộn trách nhiệm, và xác minh lại toàn bộ kiến trúc bằng test + browser/render evidence đã tích lũy. Đây không phải một broad rewrite hay giai đoạn thêm tính năng.

Trước khi sửa file:

1. Đọc root `AGENTS.md`; dossier README, execution protocol, roadmap, As-Is map, source inventory, target architecture, compatibility matrix, verification runbook, tất cả ADR; `phases/phase-08-end-to-end-stabilization.md`, `phases/phase-08-test-matrix.md`; handoff 8A và handoff 8B/8C mới nhất.
2. Chỉ tiếp tục nếu 8C `COMPLETE`, 8D `READY`, toàn bộ `P8B-*`/`P8C-*` pass và visual artifacts thực sự tồn tại. Nếu 8D `IN_PROGRESS`, chỉ resume từ handoff `PARTIAL` mới nhất khi không có agent khác đang chạy.
3. Ghi branch, HEAD và full `git status --short`. Không stage, commit, revert, delete hoặc gộp unrelated changes khi chưa có authority rõ ràng.
4. Dùng CodeGraph trước để xác minh caller/blast radius của `legacyBackgroundAdapter.ts`, mọi layout-dimensions export/view, CSS assembly, style resolver, scene pipeline và các module lớn liên quan. Chỉ sau đó mới dùng repository search bổ sung.
5. Chạy `node scripts/analyze_structure.mjs` và đánh giá theo responsibility/dependency, không split cơ học chỉ vì vượt số dòng.
6. Lập cleanup map ngắn: canonical owner, compatibility caller, dead path, mixed responsibility, public contract và verification tương ứng.

Hãy thực hiện cleanup nhỏ nhất đủ để đóng acceptance:

- Xóa `legacyBackgroundAdapter.ts` nếu CodeGraph + search + tests xác nhận không còn caller/contract cần giữ. Nếu vẫn có consumer hợp lệ, giữ đúng một derived compatibility boundary, ghi owner, reason và điều kiện loại bỏ; không duplicate renderer/CSS.
- Layout capability catalog phải là nguồn dimensions canonical. Xóa table/view hard-code trùng lặp; nếu consumer legacy cần shape cũ, derive từ catalog và thêm contract test để ngăn drift.
- Dựa trên structure analysis, chỉ extract module khi nó đang trộn responsibility hoặc dependency direction. Giữ entry points mỏng, public API tối thiểu và backward compatibility.
- Loại stale lint suppression, dead export, temporary bypass, unexplained TODO và duplicated policy thuộc Phase 8. Không sửa debt lân cận không cần thiết.
- Cleanup lint/format và JSDOM `ResizeObserver` đã hoàn tất trước 8B; chỉ xác nhận chúng vẫn sạch, không tạo workaround mới.
- Cập nhật toàn bộ dossier và evidence manifest theo code thật. Không tuyên bố visual verification nếu artifact/handoff không chứng minh.

Success criteria:

- Tất cả case `P8D-DEAD-01` đến `P8D-CLOSE-01` đạt, đồng thời toàn bộ test/evidence 8B và 8C vẫn pass.
- Không còn dimensions table hard-code song song; compatibility còn lại đều derived, có test và removal condition.
- Không còn legacy background duplication, stale suppressions, dead exports hoặc temporary bypass thuộc phạm vi.
- Chạy targeted suites rồi `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm audit:quiz-choices`, Prettier dossier, `node scripts/analyze_structure.mjs` và `git diff --check`.
- Restart/rebuild artifact cập nhật và rerun primary production + Sandbox workflow sau cleanup.
- Tạo `handoffs/phase-08d-YYYY-MM-DD.md`, cập nhật As-Is/inventory/compatibility/target/runbook/roadmap, mark Phase 8 `COMPLETE`; four-choice vẫn `DEFERRED`.
- Lập checkpoint commit plan theo boundary. Chỉ stage/commit nếu người dùng trong task mới yêu cầu rõ; nếu không, báo plan và để working tree nguyên trạng.

Nếu xóa adapter/dimensions view sẽ gây breaking change chưa được phép, evidence 8C thiếu, hoặc cleanup đòi broad rewrite, hãy dừng phần đó và ghi `PARTIAL`/blocker cụ thể thay vì xóa cưỡng ép hoặc hạ acceptance.

Final report phải nêu outcome, quyết định adapter/dimensions, modules đã/không split và lý do, debt cleanup, toàn bộ commands/results, evidence links, repository/commit state, unrelated changes preserved, remaining risk và kết luận Phase 8. Không tự commit nếu chưa được ủy quyền.

---
