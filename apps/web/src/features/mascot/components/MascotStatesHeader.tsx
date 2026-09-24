import { ShieldCheck } from "@phosphor-icons/react";
import type { MascotProfile } from "@studio/shared";
import { VariantExportControls } from "./variantExport/VariantExportControls";

export function MascotStatesHeader({ mascot, onAudit }: { mascot: MascotProfile | null; onAudit: () => void }) {
  return (
    <div className="wizard-card-header-flex">
      <h3 className="states-studio-main-heading">Mascot Styles &amp; Expressive Poses</h3>
      <div className="states-studio-header-actions">
        <button type="button" className="quiet-button is-audit-greenscreen" onClick={onAudit}>
          <ShieldCheck size={16} weight="bold" />
          <span>Audit Green Screen</span>
        </button>
        {mascot && <VariantExportControls key={mascot.id} mascotId={mascot.id} mascotName={mascot.name} />}
      </div>
    </div>
  );
}
