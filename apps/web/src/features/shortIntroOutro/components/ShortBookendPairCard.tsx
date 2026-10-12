import { useState } from "react";
import { PencilSimple, Play, Trash } from "@phosphor-icons/react";
import type { QuizShortBookendKind, QuizShortBookendPair, QuizShortTitleCanvas } from "@studio/shared";
import { quizShortBookendApi } from "../../../api/quizShortBookendApi";
import type { ShortBookendPairActions } from "../types/shortIntroOutro.types";
import { titleCanvasOverlayStyle } from "../utils/titleCanvas";
import { TitleCanvasEditor } from "./TitleCanvasEditor";

type Props = ShortBookendPairActions & {
  pair: QuizShortBookendPair;
  channelId: string;
  deleting: boolean;
  savingCanvas: boolean;
};

const KIND_LABELS: Record<QuizShortBookendKind, string> = { intro: "Intro", outro: "Outro" };

/** One uploaded Short pair: portrait thumbnails, the title area over the intro, preview and delete. */
export function ShortBookendPairCard({ pair, channelId, deleting, savingCanvas, onPreview, onDelete, onSaveTitleCanvas }: Props) {
  const [editing, setEditing] = useState(false);
  const [canvasPreview, setCanvasPreview] = useState<QuizShortTitleCanvas>(pair.title_canvas);
  const shownCanvas = editing ? canvasPreview : pair.title_canvas;

  const renderThumb = (kind: QuizShortBookendKind) => (
    <button
      type="button"
      className="short-bookend-thumb"
      aria-label={`Preview ${KIND_LABELS[kind].toLowerCase()} of pair ${pair.name}`}
      style={
        pair[kind].thumbnail_filename
          ? { backgroundImage: `url(${quizShortBookendApi.thumbUrl(channelId, pair.pair_id, kind)})` }
          : undefined
      }
      onClick={() => onPreview({ pairId: pair.pair_id, kind, title: `Pair ${pair.name} · ${KIND_LABELS[kind]}` })}
    >
      {kind === "intro" ? <span className="short-bookend-canvas-overlay" style={titleCanvasOverlayStyle(shownCanvas)} /> : null}
      <span className="short-bookend-thumb-label">
        <Play size={14} weight="fill" /> {KIND_LABELS[kind]} · {pair[kind].duration_seconds.toFixed(1)}s
        {kind === "outro" && pair.outro.has_audio ? " · audio" : ""}
      </span>
    </button>
  );

  return (
    <article className="short-bookend-pair-card" aria-label={`Short pair ${pair.name}`}>
      <div className="short-bookend-thumbs">
        {renderThumb("intro")}
        {renderThumb("outro")}
      </div>
      <footer className="short-bookend-pair-footer">
        <strong>Pair {pair.name}</strong>
        <div className="short-bookend-pair-actions">
          <button
            type="button"
            className="icon-button"
            aria-label={`Edit title area of pair ${pair.name}`}
            onClick={() => {
              setCanvasPreview(pair.title_canvas);
              setEditing((value) => !value);
            }}
          >
            <PencilSimple size={16} />
          </button>
          <button
            type="button"
            className="icon-button danger"
            aria-label={`Delete pair ${pair.name}`}
            disabled={deleting}
            onClick={() => onDelete(pair)}
          >
            <Trash size={16} />
          </button>
        </div>
      </footer>
      {editing ? (
        <TitleCanvasEditor
          pairId={pair.pair_id}
          initial={pair.title_canvas}
          saving={savingCanvas}
          onChange={setCanvasPreview}
          onCancel={() => setEditing(false)}
          onSave={(canvas) => void onSaveTitleCanvas(pair, canvas).then((saved) => saved && setEditing(false))}
        />
      ) : null}
    </article>
  );
}
