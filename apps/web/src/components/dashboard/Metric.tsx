import React from "react";
import { getNavProps } from "../../hooks/useRouter";

export type MetricProps = {
  label: string;
  value: string | number;
  note: string;
  badge?: string;
  isRunning?: boolean;
  valueColor?: string;
  className?: string;
  href?: string;
  onClick?: () => void;
};

export function Metric({ label, value, note, badge, isRunning, valueColor, className = "", href, onClick }: MetricProps) {
  const content = (
    <>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {isRunning ? (
          <span className="metric-live-badge">
            <span className="metric-live-dot" />
            <span>{badge || "RUNNING"}</span>
          </span>
        ) : badge ? (
          <span className="metric-badge">{badge}</span>
        ) : null}
      </div>
      <div className="metric-body">
        <span className="metric-value" style={valueColor ? { color: valueColor } : undefined}>
          {value}
        </span>
      </div>
      <div className="metric-footer">
        <span className="metric-note">{note}</span>
      </div>
    </>
  );

  const cardClasses = `metric ${isRunning ? "is-running" : ""} ${href || onClick ? "is-clickable" : ""} ${className}`.trim();

  if (href || onClick) {
    return (
      <a className={cardClasses} {...getNavProps(href || "#", onClick)}>
        {content}
      </a>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}
