import React from "react";

export function StatusLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="status-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}
