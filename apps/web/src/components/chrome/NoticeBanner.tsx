import { useEffect, useRef, useState } from "react";
import { CheckCircle, Sparkle, WarningCircle, X } from "@phosphor-icons/react";
import type { Notice } from "../types";

export type NoticeBannerProps = {
  notice: NonNullable<Notice>;
  onClose: () => void;
};

export function NoticeBanner({ notice, onClose }: NoticeBannerProps) {
  const duration = notice.duration ?? 4200;
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setIsPaused(false);
    remainingRef.current = duration;
    startTimeRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notice.message, notice.tone, notice.title, duration]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onCloseRef.current();
    }, remainingRef.current);
  };

  const handleAnimationEnd = () => {
    if (!isPaused) {
      onCloseRef.current();
    }
  };

  const title = notice.title ?? (notice.tone === "bad" ? "Error" : undefined);

  return (
    <div
      className={`notice-banner ${notice.tone} ${isPaused ? "is-paused" : ""}`}
      role={notice.tone === "bad" ? "alert" : "status"}
      aria-live={notice.tone === "bad" ? "assertive" : "polite"}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="notice-icon-badge">
        {notice.tone === "good" ? (
          <CheckCircle size={18} weight="fill" />
        ) : notice.tone === "bad" ? (
          <WarningCircle size={18} weight="fill" />
        ) : (
          <Sparkle size={18} weight="fill" />
        )}
      </div>
      <div className="notice-content">
        {title ? <span className="notice-title">{title}</span> : null}
        <span className="notice-message">{notice.message}</span>
      </div>
      <button className="notice-close-btn" aria-label="Close notification" onClick={onClose}>
        <X size={14} weight="bold" />
      </button>
      <div className="notice-progress">
        <div
          key={`${notice.tone}-${notice.message}`}
          className="notice-progress-fill"
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: isPaused ? "paused" : "running",
          }}
          onAnimationEnd={handleAnimationEnd}
        />
      </div>
    </div>
  );
}
