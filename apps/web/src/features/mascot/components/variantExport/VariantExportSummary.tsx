import type { VariantExportSummary as Summary } from "@studio/shared";

export function VariantExportSummary({ summary, loading }: { summary: Summary | null; loading: boolean }) {
  if (loading) return <p role="status">Loading variants…</p>;
  if (!summary) return null;
  return (
    <>
      <p>
        {summary.styles} styles · {summary.thinking} Thinking · {summary.celebrate} Celebrate
        {summary.empty > 0 ? ` · ${summary.empty} empty slots` : ""}
      </p>
      {summary.thinking + summary.celebrate === 0 && <p>No variants available</p>}
    </>
  );
}
