import { useEffect, useMemo, useState } from "react";
import { CircleNotch, FilmStrip, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import type { BankQuestionWithCooldown, Channel, ShortReelRecord } from "@studio/shared";
import { api } from "../../../api";
import { AccessibleModal } from "../../../components/AccessibleModal";
import { CreateShortReelQuestionCard } from "./createShortReel/CreateShortReelQuestionCard";
import { CreateShortReelStylePicker, type ReelVisualStyle } from "./createShortReel/CreateShortReelStylePicker";

export interface CreateShortReelModalProps {
  channel: Channel;
  onClose: () => void;
  onCreated: (shortReel: ShortReelRecord) => void;
}

const MODAL_TITLE_ID = "create-short-reel-modal-title";

const ARCHETYPE_PILLS = [
  { id: "all", label: "All" },
  { id: "versus_faceoff", label: "Versus Faceoff" },
  { id: "deep_trivia", label: "Deep Trivia" },
  { id: "fact_chain", label: "Fact Chain" },
  { id: "odd_one_out", label: "Odd One Out" },
];

export function CreateShortReelModal({ channel, onClose, onCreated }: CreateShortReelModalProps) {
  const [questions, setQuestions] = useState<BankQuestionWithCooldown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState("all");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [visualStyle, setVisualStyle] = useState<ReelVisualStyle>("mixed");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getChannelQuestionBankQuestions(channel.channel_id, { status: "approved" })
      .then((res) => {
        if (active) setQuestions(res.questions || []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load questions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [channel.channel_id]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (selectedArchetype !== "all" && q.archetype_id !== selectedArchetype) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();
      return (
        q.question.toLowerCase().includes(term) ||
        q.choices.some((c) => c.text.toLowerCase().includes(term)) ||
        q.domain_id?.toLowerCase().includes(term)
      );
    });
  }, [questions, selectedArchetype, search]);

  const handleCreate = async () => {
    if (!selectedQuestionId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createShortReel(channel.channel_id, {
        question_id: selectedQuestionId,
        visual_style: visualStyle,
      });
      onCreated(res.short_reel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Short-Reel");
      setSubmitting(false);
    }
  };

  return (
    <AccessibleModal titleId={MODAL_TITLE_ID} onDismiss={onClose} dismissalAllowed={!submitting}>
      <div className="modal short-reel-create-modal" role="dialog" aria-modal="true" aria-labelledby={MODAL_TITLE_ID}>
        <div className="short-reel-modal-header">
          <div className="short-reel-modal-header-info">
            <div className="short-reel-modal-title-row">
              <div className="short-reel-icon-wrap">
                <FilmStrip size={20} weight="fill" />
              </div>
              <div>
                <h2 id={MODAL_TITLE_ID}>Create Short-Reel (9:16)</h2>
                <p className="short-reel-modal-subtitle">Pick an approved Question Bank item to craft a vertical video story</p>
              </div>
            </div>
          </div>
          <button type="button" className="channel-create-close-btn" onClick={onClose} aria-label="Close" disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <div className="short-reel-modal-toolbar">
          <div className="short-reel-modal-search">
            <MagnifyingGlass size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search approved questions or options..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="short-reel-search-input"
              aria-label="Search questions"
            />
            {search ? (
              <button type="button" className="search-clear-btn" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={13} />
              </button>
            ) : null}
          </div>

          <div className="short-reel-archetype-pills" role="radiogroup" aria-label="Filter by archetype">
            {ARCHETYPE_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                role="radio"
                aria-checked={selectedArchetype === pill.id}
                className={`archetype-pill ${selectedArchetype === pill.id ? "is-active" : ""}`}
                onClick={() => setSelectedArchetype(pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="short-reel-modal-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="short-reel-question-list" role="radiogroup" aria-label="Available questions">
          {loading ? (
            <div className="short-reel-modal-loading" data-testid="short-reel-loading">
              <CircleNotch size={24} className="spin" />
              <span>Loading questions...</span>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="short-reel-modal-empty" data-testid="short-reel-empty">
              <p>No approved questions match your criteria.</p>
            </div>
          ) : (
            filteredQuestions.map((q) => (
              <CreateShortReelQuestionCard
                key={q.id}
                question={q}
                isSelected={selectedQuestionId === q.id}
                onSelect={(id) => setSelectedQuestionId(id)}
              />
            ))
          )}
        </div>

        <div className="short-reel-modal-footer">
          <CreateShortReelStylePicker value={visualStyle} onChange={setVisualStyle} disabled={submitting} />

          <div className="short-reel-modal-actions">
            <button type="button" className="quiet-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleCreate()}
              disabled={!selectedQuestionId || submitting}
              data-testid="create-short-reel-submit-btn"
            >
              {submitting ? <CircleNotch size={16} className="spin" /> : <Plus size={16} />}
              <span>{submitting ? "Creating..." : "Create Short-Reel"}</span>
            </button>
          </div>
        </div>
      </div>
    </AccessibleModal>
  );
}
