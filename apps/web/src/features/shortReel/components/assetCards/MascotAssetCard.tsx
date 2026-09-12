import { ReelAssetCard } from "../ReelAssetCard";

export interface MascotAssetCardProps {
  acceptedMascotRef?: { width: number; height: number; mime_type: string; checksum: string };
  mascotDisplayUrl: string | null;
  channelMasterUrl: string | null;
}

export function MascotAssetCard({ acceptedMascotRef, mascotDisplayUrl, channelMasterUrl }: MascotAssetCardProps) {
  return (
    <ReelAssetCard
      title="Channel Mascot Reference"
      roleLabel="Mascot"
      badge={{
        label: acceptedMascotRef ? "Accepted Asset" : channelMasterUrl ? "Channel Master" : "Not Assigned",
        tone: acceptedMascotRef ? "ready" : channelMasterUrl ? "neutral" : "missing",
      }}
      aspectRatio="1:1"
      imageUrl={mascotDisplayUrl}
      imageAlt="Mascot reference"
      meta={
        acceptedMascotRef
          ? {
              dimensions: `${acceptedMascotRef.width}×${acceptedMascotRef.height}`,
              mimeType: acceptedMascotRef.mime_type,
              checksum: acceptedMascotRef.checksum,
            }
          : undefined
      }
      downloadUrl={mascotDisplayUrl}
      downloadName="mascot-master.png"
      emptyState={{
        title: "No Mascot Assigned",
        description: "Assign a mascot to this channel in Mascot Studio to generate portrait packages.",
        actionLink: {
          label: "Open Mascot Studio",
          href: "#mascots",
        },
      }}
      ariaLabel="Mascot Reference"
    />
  );
}
