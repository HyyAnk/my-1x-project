import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { type MascotActionType, type MascotProfile, type QuizImageStyle } from "@studio/shared";
import { useTranslation } from "../../../i18n";
import { AUXILIARY_ACTIONS, BRAND_IDENTITY_ACTIONS, CORE_GAMEPLAY_ACTIONS } from "../constants";
import { ActionCard } from "./ActionCard";
import { ActionsSidebar } from "./ActionsSidebar";
import { ActionPromptModal } from "./ActionPromptModal";

export type MascotActionsStepProps = {
  editingMascot: MascotProfile | null;
  genName: string;
  genStyle: QuizImageStyle;
  genColor: string;
  busyAction: string | null;
  generationElapsed: number;
  batchState: {
    currentIndex: number;
    total: number;
    currentAction: MascotActionType | null;
    queue: MascotActionType[];
  } | null;
  itemProgress: number;
  overallProgress: number;
  currentStageMessage: string;
  dragOverAction: MascotActionType | null;
  setDragOverAction: (action: MascotActionType | null) => void;
  promptEditAction: MascotActionType | null;
  setPromptEditAction: (action: MascotActionType | null) => void;
  actionPrompts: Record<MascotActionType, string>;
  setActionPrompts: React.Dispatch<React.SetStateAction<Record<MascotActionType, string>>>;
  onGenerateSprite: (action: MascotActionType) => void;
  onBatchGenerateSprites: () => void;
  onBatchGenerateCoreSprites: () => void;
  onUploadSprite: (action: MascotActionType, file: File) => void;
  onDropSprite: (action: MascotActionType, e: React.DragEvent) => void;
  onRemoveBackground: (target: "master" | "all" | MascotActionType) => void;
  onSelectPreviewAction: (action: MascotActionType) => void;
  onBackStep: () => void;
  onNextStep: () => void;
  onOpenLightbox: (img: string) => void;
};

export function MascotActionsStep({
  editingMascot,
  genName,
  genStyle,
  genColor,
  busyAction,
  generationElapsed,
  batchState,
  itemProgress,
  overallProgress,
  currentStageMessage,
  dragOverAction,
  setDragOverAction,
  promptEditAction,
  setPromptEditAction,
  actionPrompts,
  setActionPrompts,
  onGenerateSprite,
  onBatchGenerateSprites,
  onBatchGenerateCoreSprites,
  onUploadSprite,
  onDropSprite,
  onRemoveBackground,
  onSelectPreviewAction,
  onBackStep,
  onNextStep,
  onOpenLightbox,
}: MascotActionsStepProps) {
  const { t } = useTranslation();

  const renderCard = (action: MascotActionType, isCore = false) => (
    <ActionCard
      key={action}
      action={action}
      isCore={isCore}
      editingMascot={editingMascot}
      busyAction={busyAction}
      batchState={batchState}
      dragOverAction={dragOverAction}
      setDragOverAction={setDragOverAction}
      setPromptEditAction={setPromptEditAction}
      currentStageMessage={currentStageMessage}
      generationElapsed={generationElapsed}
      itemProgress={itemProgress}
      onGenerateSprite={onGenerateSprite}
      onUploadSprite={onUploadSprite}
      onDropSprite={onDropSprite}
      onRemoveBackground={onRemoveBackground}
      onSelectPreviewAction={onSelectPreviewAction}
      onNextStep={onNextStep}
    />
  );

  return (
    <div className="wizard-step-content">
      <div className="wizard-card">
        <div className="wizard-card-header-flex">
          <div>
            <h3>{t("mascots.statesStudioTitle")}</h3>
          </div>
        </div>

        <div className="states-studio-layout">
          <ActionsSidebar
            editingMascot={editingMascot}
            genName={genName}
            genStyle={genStyle}
            genColor={genColor}
            busyAction={busyAction}
            generationElapsed={generationElapsed}
            batchState={batchState}
            itemProgress={itemProgress}
            overallProgress={overallProgress}
            currentStageMessage={currentStageMessage}
            onBatchGenerateSprites={onBatchGenerateSprites}
            onBatchGenerateCoreSprites={onBatchGenerateCoreSprites}
            onRemoveBackground={onRemoveBackground}
            onOpenLightbox={onOpenLightbox}
          />

          <main className="states-groups-container">
            {/* Section 1: Core Gameplay Poses (2) */}
            <section className="states-group-section is-core-group">
              <div className="states-group-header">
                <div className="states-group-title-wrap">
                  <h4>{t("mascots.coreGroupTitle")}</h4>
                </div>
              </div>
              <div className="artistic-states-grid">{CORE_GAMEPLAY_ACTIONS.map((action) => renderCard(action, true))}</div>
            </section>

            {/* Section 2: Brand & Signature Poses (2) */}
            <section className="states-group-section">
              <div className="states-group-header">
                <div className="states-group-title-wrap">
                  <h4>{t("mascots.brandGroupTitle")}</h4>
                </div>
              </div>
              <div className="artistic-states-grid">{BRAND_IDENTITY_ACTIONS.map((action) => renderCard(action, false))}</div>
            </section>

            {/* Section 3: Auxiliary Reactions (3) */}
            <section className="states-group-section">
              <div className="states-group-header">
                <div className="states-group-title-wrap">
                  <h4>{t("mascots.auxGroupTitle")}</h4>
                </div>
              </div>
              <div className="artistic-states-grid">{AUXILIARY_ACTIONS.map((action) => renderCard(action, false))}</div>
            </section>
          </main>
        </div>

        <div className="wizard-action-row" style={{ marginTop: "24px" }}>
          <button type="button" className="quiet-button" onClick={onBackStep}>
            <ArrowLeft size={15} />
            <span>{t("mascots.backIdentityBtn")}</span>
          </button>
          <button type="button" className="primary-button" onClick={onNextStep}>
            <span>{t("mascots.nextAnimationBtn")}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <ActionPromptModal
        promptEditAction={promptEditAction}
        setPromptEditAction={setPromptEditAction}
        actionPrompts={actionPrompts}
        setActionPrompts={setActionPrompts}
        onGenerateSprite={onGenerateSprite}
      />
    </div>
  );
}
