import type { Channel } from "@studio/shared";
import type { Notice } from "../../../components/types";
import { MascotAssignModal } from "../../../components/MascotAssignModal";
import { CreateShortReelModal } from "./CreateShortReelModal";
import { DeleteEpisodeModal } from "./DeleteEpisodeModal";
import { DeleteShortReelModal } from "./DeleteShortReelModal";
import { EditChannelModal } from "./EditChannelModal";
import { buildHash } from "../../../hooks/useRouter";
import type { useChannelDetail } from "../hooks/useChannelDetail";

export interface ChannelDetailModalsProps {
  channel: Channel;
  state: ReturnType<typeof useChannelDetail>;
  isCreateShortReelOpen: boolean;
  setIsCreateShortReelOpen: (isOpen: boolean) => void;
  onRefresh: () => Promise<void>;
  onNotice: (notice: NonNullable<Notice>) => void;
}

export function ChannelDetailModals({
  channel,
  state,
  isCreateShortReelOpen,
  setIsCreateShortReelOpen,
  onRefresh,
  onNotice,
}: ChannelDetailModalsProps) {
  return (
    <>
      {/* Edit Channel Profile Modal */}
      {state.isEditProfileOpen ? (
        <EditChannelModal
          channel={channel}
          onClose={() => state.setIsEditProfileOpen(false)}
          onSaved={async () => {
            await state.load();
            await onRefresh();
          }}
          onNotice={onNotice}
        />
      ) : null}

      {/* Unified Mascot Video Stage Studio Modal (Single Channel Mode) */}
      <MascotAssignModal
        isOpen={state.isStageStudioOpen}
        singleChannelId={channel.channel_id}
        mascot={state.mascotsList.find((m) => m.id === channel.mascot_id) || null}
        channels={[channel]}
        allMascots={state.mascotsList}
        onClose={() => state.setIsStageStudioOpen(false)}
        onSaved={async () => {
          await onRefresh();
        }}
        onNotice={onNotice}
      />

      {state.deleteEpisodeTarget ? (
        <DeleteEpisodeModal
          channel={channel}
          episode={state.deleteEpisodeTarget}
          onClose={() => state.setDeleteEpisodeTarget(null)}
          onDeleted={state.handleEpisodeDeleted}
          onError={(error) => onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not delete episode" })}
        />
      ) : null}

      {state.deleteShortReelTarget ? (
        <DeleteShortReelModal
          channel={channel}
          reel={state.deleteShortReelTarget}
          onClose={() => state.setDeleteShortReelTarget(null)}
          onDeleted={state.handleShortReelDeleted}
          onError={(error) => onNotice({ tone: "bad", message: error instanceof Error ? error.message : "Could not delete Short-Reel" })}
        />
      ) : null}

      {isCreateShortReelOpen ? (
        <CreateShortReelModal
          channel={channel}
          onClose={() => setIsCreateShortReelOpen(false)}
          onCreated={async (newReel) => {
            setIsCreateShortReelOpen(false);
            onNotice({
              tone: "good",
              message: `Short-Reel created: ${newReel.topic.title}`,
            });
            await state.load();
            await onRefresh();
            window.location.hash = buildHash({ page: "channels", channelId: channel.channel_id, shortReelId: newReel.reel_id });
          }}
        />
      ) : null}
    </>
  );
}
