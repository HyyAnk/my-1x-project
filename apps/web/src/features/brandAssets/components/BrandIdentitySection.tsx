import type { ChannelAssetsOverviewResponse } from "@studio/shared";
import { MascotMasterConceptCard } from "./MascotMasterConceptCard";
import { ChannelLogoCard } from "./ChannelLogoCard";

export interface BrandIdentitySectionProps {
  overview: ChannelAssetsOverviewResponse | null;
  isLoading?: boolean;
  isMutating?: boolean;
  onUploadLogo: (file: File) => Promise<void>;
  onDeleteLogo: () => Promise<void>;
  onOpenMascot?: (mascotId?: string | null) => void;
}

export function BrandIdentitySection({
  overview,
  isLoading = false,
  isMutating = false,
  onUploadLogo,
  onDeleteLogo,
  onOpenMascot,
}: BrandIdentitySectionProps) {
  const logo = overview?.manifest?.brand?.logo;
  const mascot = overview?.mascot;

  return (
    <section
      className={`brand-identity-section ${isLoading ? "is-loading" : ""}`}
      data-testid="brand-identity-section"
      aria-label="Brand Identity Section"
    >
      <div className="section-intro">
        <h2 className="section-title">Brand Identity</h2>
        <p className="section-subtitle">
          Core visual brand assets including channel mascot representation and official channel logo.
        </p>
      </div>

      <div className="brand-identity-grid">
        <MascotMasterConceptCard
          mascot={mascot}
          onOpenMascot={onOpenMascot}
        />
        <ChannelLogoCard
          logo={logo}
          isMutating={isMutating || isLoading}
          onUploadLogo={onUploadLogo}
          onDeleteLogo={onDeleteLogo}
        />
      </div>
    </section>
  );
}
