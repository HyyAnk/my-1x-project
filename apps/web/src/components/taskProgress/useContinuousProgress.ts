import { useEffect, useRef, useState } from "react";
import { isTaskActive } from "../../lib/utils";
import type { Task } from "@studio/shared";

export function useContinuousProgress(task: Task, rawPercent: number | null): number | null {
  const active = isTaskActive(task);
  const completed = task.status === "COMPLETED";
  const failed = task.status === "FAILED";
  const cancelled = task.status === "CANCELLED";
  const measuredRender = task.render_progress !== null;
  const hasNoProgress = rawPercent === null && !active && !completed;
  const initial = completed ? 100 : (rawPercent ?? 0);
  const [displayPercent, setDisplayPercent] = useState<number>(initial);
  const backendTargetRef = useRef<number>(initial);

  // Synchronize with backend updates
  useEffect(() => {
    if (completed) {
      backendTargetRef.current = 100;
    } else if (typeof rawPercent === "number") {
      backendTargetRef.current = Math.max(backendTargetRef.current, rawPercent);
      setDisplayPercent((prev) => Math.max(prev, rawPercent));
    }
  }, [rawPercent, completed]);

  useEffect(() => {
    if (failed || cancelled) return;
    if (measuredRender) return;

    if (completed) {
      const timer = setInterval(() => {
        setDisplayPercent((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          const step = Math.max(0.5, (100 - prev) * 0.25);
          return Math.min(100, prev + step);
        });
      }, 40);
      return () => clearInterval(timer);
    }

    if (!active) return;

    // Active continuous smooth trickle
    const interval = setInterval(() => {
      setDisplayPercent((prev) => {
        const anchor = backendTargetRef.current;
        // Ceiling for the current step (allows continuous tick up to +18% above backend anchor or 96% max)
        const ceiling = Math.min(96, Math.max(anchor + 18, prev + 2));

        if (prev < anchor) {
          // Rapid catch-up to backend anchor
          const diff = anchor - prev;
          const jump = Math.max(0.4, diff * 0.18);
          return Math.min(anchor, prev + jump);
        }

        if (prev < ceiling) {
          // Asymptotic deceleration trickle: smooth and constant
          const remaining = ceiling - prev;
          const delta = Math.max(0.08, remaining * 0.035);
          return Math.min(ceiling, prev + delta);
        }

        if (prev < 96) {
          // Micro crawl while waiting for a long backend step
          return prev + 0.04;
        }

        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [active, completed, failed, cancelled, measuredRender]);

  if (hasNoProgress) return null;
  if (measuredRender) return completed ? 100 : rawPercent;
  return displayPercent;
}
