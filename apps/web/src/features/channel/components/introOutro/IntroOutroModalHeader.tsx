import React from "react";
import { FilmSlate, X } from "@phosphor-icons/react";

export interface IntroOutroModalHeaderProps {
  onClose: () => void;
  disabled?: boolean;
  categoryName: string;
}

export const IntroOutroModalHeader: React.FC<IntroOutroModalHeaderProps> = ({ onClose, categoryName, disabled = false }) => {
  return (
    <div className="intro-outro-modal-header">
      <div className="intro-outro-modal-header-left">
        <div className="intro-outro-modal-badge-icon">
          <FilmSlate size={22} weight="duotone" />
        </div>
        <div>
          <h2 id="intro-outro-modal-title" className="intro-outro-modal-title">
            Upload Pair
          </h2>
          <p className="intro-outro-modal-subtitle">{categoryName}</p>
        </div>
      </div>
      <button type="button" className="icon-button" onClick={onClose} disabled={disabled} aria-label="Close modal">
        <X size={18} />
      </button>
    </div>
  );
};
