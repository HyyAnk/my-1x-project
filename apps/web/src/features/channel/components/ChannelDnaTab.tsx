import { useState } from "react";
import type { Channel, ChannelMascotConfig, MascotProfile, Task } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { ChannelProfileCard } from "./ChannelProfileCard";
import { ChannelVisualIdentityCard } from "./ChannelVisualIdentityCard";
import { ChannelMascotCard } from "./ChannelMascotCard";
import { ChannelDnaBlueprintSection } from "./ChannelDnaBlueprintSection";
import { EditChannelModal } from "./EditChannelModal";

type ChannelDnaTabProps = {
  channel: Channel;
  dna: { content: string; path: string; modified_at: string } | null;
  dnaDraft: string;
  setDnaDraft: (draft: string) => void;
  editingDna: boolean;
  setEditingDna: (editing: boolean) => void;
  busy: string | null;
  dnaTask: Task | null;
  topicClock: number;
  totalEpisodes: number;
  mascotsList: MascotProfile[];
  changingMascot: boolean;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
  onSaveDna: () => Promise<void>;
  onMascotChange: (mascotId: string | null) => Promise<void>;
  onMascotConfigUpdate: (updates: Partial<ChannelMascotConfig>) => Promise<void>;
  onOpenStageStudio: () => void;
  onTaskSubmitted?: (task: Task) => void;
};

export function ChannelDnaTab({
  channel,
  dna,
  dnaDraft,
  setDnaDraft,
  editingDna,
  setEditingDna,
  busy,
  dnaTask,
  topicClock,
  mascotsList,
  changingMascot,
  onRefresh,
  onNotice,
  onSaveDna,
  onMascotChange,
  onOpenStageStudio,
  onTaskSubmitted,
}: ChannelDnaTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <div className="channel-dna-dashboard-layout" style={{ marginTop: "16px" }}>
      {/* Row 1: Profile & Localization + Visual & Presentation (2 balanced columns) */}
      <div className="channel-dna-top-grid">
        <ChannelProfileCard channel={channel} onOpenEditModal={() => setIsEditModalOpen(true)} />
        <ChannelVisualIdentityCard channel={channel} onRefresh={onRefresh} onNotice={onNotice} />
      </div>

      {/* Row 2: Mascot & Video Host Persona */}
      <ChannelMascotCard
        channel={channel}
        mascotsList={mascotsList}
        changingMascot={changingMascot}
        onMascotChange={onMascotChange}
        onOpenStageStudio={onOpenStageStudio}
      />

      {/* Row 3: AI DNA Blueprint (Prompt blueprint & Rules) */}
      <ChannelDnaBlueprintSection
        channel={channel}
        dna={dna}
        dnaDraft={dnaDraft}
        setDnaDraft={setDnaDraft}
        editingDna={editingDna}
        setEditingDna={setEditingDna}
        busy={busy}
        dnaTask={dnaTask}
        topicClock={topicClock}
        onRefresh={onRefresh}
        onNotice={onNotice}
        onSaveDna={onSaveDna}
        onTaskSubmitted={onTaskSubmitted}
      />

      {/* Modal: Edit Channel Profile */}
      {isEditModalOpen ? (
        <EditChannelModal channel={channel} onClose={() => setIsEditModalOpen(false)} onSaved={onRefresh} onNotice={onNotice} />
      ) : null}
    </div>
  );
}
