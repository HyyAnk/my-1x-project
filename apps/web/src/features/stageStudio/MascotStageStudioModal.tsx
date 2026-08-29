import { ArrowsOutSimple, Users } from "@phosphor-icons/react";
import type { MascotStageStudioModalProps } from "./types";
import { useStageStudio } from "./hooks/useStageStudio";
import { StageStudioHeader } from "./components/StageStudioHeader";
import { StageCanvasViewport } from "./components/StageCanvasViewport";
import { StageTimelineBar } from "./components/StageTimelineBar";
import { StageTransformTab } from "./components/StageTransformTab";
import { StageChannelsTab } from "./components/StageChannelsTab";
import { StageStudioFooter } from "./components/StageStudioFooter";

export function MascotStageStudioModal(props: MascotStageStudioModalProps) {
  const { isOpen, onClose, channels, allMascots = [] } = props;
  const studio = useStageStudio(props);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop stage-studio-backdrop" role="presentation">
      <section className="modal stage-studio-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="stage-studio-title">
        {/* Pro Studio Header */}
        <StageStudioHeader studio={studio} onClose={onClose} />

        {/* 2-Pane Pro Working Environment */}
        <div className="stage-studio-main-body">
          {/* Left / Center 68%: Live Interactive Stage Canvas & Timeline */}
          <div className="stage-studio-canvas-pane">
            <StageCanvasViewport studio={studio} />
            <StageTimelineBar studio={studio} />
          </div>

          {/* Right 32%: Inspector & Channel Hub */}
          <div className="stage-studio-inspector-pane">
            {/* Inspector Tab Selector */}
            <div className="stage-inspector-tab-bar">
              <button
                type="button"
                className={`inspector-nav-tab ${studio.activeInspectorTab === "transform" ? "is-active" : ""}`}
                onClick={() => studio.setActiveInspectorTab("transform")}
              >
                <ArrowsOutSimple size={15} />
                <span>{studio.t("stageStudio.tabTransform")}</span>
              </button>

              <button
                type="button"
                className={`inspector-nav-tab ${studio.activeInspectorTab === "channels" ? "is-active" : ""}`}
                onClick={() => studio.setActiveInspectorTab("channels")}
              >
                <Users size={15} />
                <span>
                  {studio.isSingleChannelMode
                    ? studio.t("stageStudio.tabSingleChannelMascot")
                    : studio.t("stageStudio.tabMultiChannelApply", { count: studio.selectedChannelIds.length })}
                </span>
              </button>
            </div>

            {/* Inspector Tab Panes */}
            <div className="stage-inspector-body">
              {studio.activeInspectorTab === "transform" ? (
                <StageTransformTab studio={studio} />
              ) : (
                <StageChannelsTab studio={studio} channels={channels} allMascots={allMascots} />
              )}
            </div>
          </div>
        </div>

        {/* Pro Studio Footer */}
        <StageStudioFooter studio={studio} onClose={onClose} />
      </section>
    </div>
  );
}
