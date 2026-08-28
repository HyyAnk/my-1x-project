import { CircleNotch, MagnifyingGlass, Smiley, Trash, X } from "@phosphor-icons/react";
import { ALL_QUIZ_IMAGE_STYLES, QUIZ_IMAGE_STYLE_LABELS, type Channel, type MascotProfile } from "@studio/shared";
import { EmptyState } from "../../components/EmptyState";
import { MascotAssignModal } from "../../components/MascotAssignModal";
import type { Notice } from "../../components/types";
import { useTranslation } from "../../i18n";
import { MascotCard } from "./components/MascotCard";
import { useMascotLibrary } from "./hooks/useMascotLibrary";

type MascotLibraryTabProps = {
  channels: Channel[];
  onNotice: (notice: NonNullable<Notice>) => void;
  onRefreshChannels: () => Promise<void>;
  onStartNew: () => void;
  onEditMascot: (mascot: MascotProfile) => void;
  libraryState: ReturnType<typeof useMascotLibrary>;
};

export function MascotLibraryTab({
  channels,
  onNotice,
  onRefreshChannels,
  onStartNew,
  onEditMascot,
  libraryState,
}: MascotLibraryTabProps) {
  const { t } = useTranslation();
  const {
    mascots,
    loading,
    searchQuery,
    setSearchQuery,
    styleFilter,
    setStyleFilter,
    filteredMascots,
    quickAssignMascot,
    setQuickAssignMascot,
    deleteTarget,
    setDeleteTarget,
    deleting,
    loadMascots,
    handleDeleteConfirm,
  } = libraryState;

  return (
    <div className="mascot-library-container">
      {/* Search & Style Filter Toolbar */}
      <div className="episode-toolbar" style={{ marginBottom: "18px" }}>
        <div className="episode-search-wrap">
          <MagnifyingGlass size={15} className="search-icon" />
          <input
            type="text"
            placeholder={t("mascots.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="episode-search-input"
          />
          {searchQuery ? (
            <button type="button" className="search-clear-btn" onClick={() => setSearchQuery("")}>
              <X size={13} />
            </button>
          ) : null}
        </div>

        <div className="episode-filter-chips">
          <button
            type="button"
            className={`filter-chip ${styleFilter === "all" ? "is-active" : ""}`}
            onClick={() => setStyleFilter("all")}
          >
            {t("mascots.filterAllStyles")} ({mascots.length})
          </button>
          {ALL_QUIZ_IMAGE_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              className={`filter-chip ${styleFilter === style ? "is-active" : ""}`}
              onClick={() => setStyleFilter(style)}
            >
              {QUIZ_IMAGE_STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "grid", placeItems: "center", padding: "60px 0" }}>
          <CircleNotch size={32} className="spin" style={{ color: "var(--accent)" }} />
          <p style={{ marginTop: "12px", color: "var(--muted)" }}>{t("common.loading")}</p>
        </div>
      ) : filteredMascots.length === 0 ? (
        <EmptyState
          icon={<Smiley size={36} />}
          title={searchQuery ? t("common.noResults") : t("mascots.noMascotsTitle")}
          copy={
            searchQuery
              ? t("common.noResults")
              : t("mascots.noMascotsCopy")
          }
          action={searchQuery ? t("common.clear") : t("mascots.newMascot")}
          onAction={searchQuery ? () => setSearchQuery("") : onStartNew}
        />
      ) : (
        <div className="mascot-grid">
          {filteredMascots.map((mascot) => (
            <MascotCard
              key={mascot.id}
              mascot={mascot}
              channels={channels}
              onEdit={onEditMascot}
              onQuickAssign={setQuickAssignMascot}
              onDeleteRequest={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Quick Channel Assignment Modal */}
      <MascotAssignModal
        isOpen={Boolean(quickAssignMascot)}
        mascot={quickAssignMascot}
        channels={channels}
        allMascots={mascots}
        onClose={() => setQuickAssignMascot(null)}
        onSaved={async () => {
          await onRefreshChannels();
          await loadMascots();
        }}
        onNotice={onNotice}
      />

      {/* Delete Mascot Confirmation Modal */}
      {deleteTarget ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-mascot-title">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">{t("mascots.deleteEyebrow")}</p>
                <h2 id="delete-mascot-title">{t("mascots.deleteTitle", { name: deleteTarget.name })}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={t("common.close")}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <X size={18} />
              </button>
            </div>
            <p className="modal-copy">
              {t("mascots.deleteWarning", { name: deleteTarget.name })}
            </p>
            <div className="modal-actions">
              <button type="button" className="quiet-button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="primary-button danger-confirm"
                onClick={() => void handleDeleteConfirm()}
                disabled={deleting}
              >
                {deleting ? <CircleNotch className="spin" size={16} /> : <Trash size={16} />}
                <span>{deleting ? t("mascots.deletingBtn") : t("mascots.deleteConfirmBtn")}</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
