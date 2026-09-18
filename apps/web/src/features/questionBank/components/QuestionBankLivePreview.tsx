import { useState } from "react";
import type { BankQuestionWithCooldown } from "../types/questionBankUi.types";
import { useRouteTab } from "../../../hooks/router/useRouteTab";
import { PreviewEmptyState, PreviewStickyHeader, PreviewTabsBar, QuestionBankArcadeTab, QuestionBankDetailsTab } from "./preview";

export interface QuestionBankLivePreviewProps {
  question: BankQuestionWithCooldown | null;
  buildingVideo?: boolean;
  onQuickBuildVideo?: (q: BankQuestionWithCooldown) => void;
  activeTab?: string | null;
  onTabChange?: (tab: string) => void;
}

const PREVIEW_TABS = ["arcade", "details"] as const;

export function QuestionBankLivePreview(props: QuestionBankLivePreviewProps) {
  const { question, buildingVideo, onQuickBuildVideo, activeTab: routeTab, onTabChange } = props;
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeTab, switchTab] = useRouteTab({
    value: routeTab,
    allowedTabs: PREVIEW_TABS,
    fallback: "arcade",
    onChange: onTabChange,
  });

  if (!question) return <PreviewEmptyState />;

  return (
    <div className="qb-preview-card">
      <PreviewStickyHeader
        question={question}
        showAnswer={showAnswer}
        onToggleAnswer={() => setShowAnswer((prev) => !prev)}
        buildingVideo={buildingVideo}
        onQuickBuildVideo={onQuickBuildVideo}
      />
      <PreviewTabsBar activeTab={activeTab} onSwitchTab={switchTab} />
      <div className="qb-preview-scroll-body">
        {activeTab === "arcade" ? (
          <QuestionBankArcadeTab question={question} showAnswer={showAnswer} />
        ) : (
          <QuestionBankDetailsTab question={question} />
        )}
      </div>
    </div>
  );
}
