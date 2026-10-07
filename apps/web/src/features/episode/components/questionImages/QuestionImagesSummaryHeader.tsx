import React from "react";
import { ArrowsClockwise, CheckCircle, Image, Sparkle, UploadSimple, WarningCircle } from "@phosphor-icons/react";
import type { QuestionImagesOverviewResponse } from "../../types/questionImages.types";

export interface QuestionImagesSummaryHeaderProps {
  overview: QuestionImagesOverviewResponse | null;
  loading: boolean;
  onRefresh: () => void | Promise<unknown>;
}

export function QuestionImagesSummaryHeader({
  overview,
  loading,
  onRefresh,
}: QuestionImagesSummaryHeaderProps): React.JSX.Element {
  const total = overview?.total_questions ?? 0;
  const ready = overview?.ready_count ?? 0;
  const uploaded = overview?.uploaded_count ?? 0;
  const missing = overview?.missing_count ?? 0;

  return (
    <div className="question-images-header-deck">
      <div>
        <h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 600 }}>Question Images & Visual Assets</h3>
        <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--text-muted, #a1a1aa)" }}>
          Monitor AI image generations and manually upload replacements for specific quiz questions.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div className="question-images-stats">
          <span className="question-images-stat-pill" title="Total questions in this episode">
            <Image size={14} />
            <span>Total: {total}</span>
          </span>

          <span
            className="question-images-stat-pill"
            style={{ color: ready === total && total > 0 ? "var(--color-green, #4ade80)" : undefined }}
            title="Questions with ready visual assets"
          >
            <CheckCircle size={14} />
            <span>Ready: {ready}/{total}</span>
          </span>

          {uploaded > 0 ? (
            <span
              className="question-images-stat-pill"
              style={{ color: "var(--color-purple, #c084fc)" }}
              title="Manual user-uploaded images"
            >
              <UploadSimple size={14} />
              <span>Custom: {uploaded}</span>
            </span>
          ) : null}

          {missing > 0 ? (
            <span
              className="question-images-stat-pill"
              style={{ color: "var(--color-red, #f87171)" }}
              title="Questions missing an image asset"
            >
              <WarningCircle size={14} />
              <span>Missing: {missing}</span>
            </span>
          ) : null}
        </div>

        <button
          type="button"
          className="quiet-button compact"
          onClick={() => void onRefresh()}
          disabled={loading}
          title="Refresh question images status"
        >
          <ArrowsClockwise size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}
