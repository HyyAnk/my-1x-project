import { lazy, Suspense } from "react";
import type { Channel, StorageInfo, Task } from "@studio/shared";
import type { ChannelGroupId } from "./channel/ChannelsListView";

const CreateChannelModal = lazy(() =>
  import("../features/channel/components/CreateChannelModal").then((m) => ({ default: m.CreateChannelModal })),
);
const DeleteChannelModal = lazy(() =>
  import("../features/channel/components/DeleteChannelModal").then((m) => ({ default: m.DeleteChannelModal })),
);
const StorageSetupModal = lazy(() => import("../features/settings/StorageSetupModal").then((m) => ({ default: m.StorageSetupModal })));

export type AppModalsProps = {
  showCreate: ChannelGroupId | null;
  setShowCreate: (group: ChannelGroupId | null) => void;
  deleteTarget: Channel | null;
  setDeleteTarget: (channel: Channel | null) => void;
  storage: StorageInfo | null;
  openChannel: (channelId: string) => void;
  refresh: () => Promise<void>;
  upsertTask: (task: Task) => void;
  setNotice: (notice: { tone: "good" | "bad"; message: string } | null) => void;
  showError: (error: unknown) => void;
  handleChannelDeleted: (channel: Channel) => Promise<void>;
  applyStorage: (nextStorage: StorageInfo) => Promise<void>;
};

export function AppModals({
  showCreate,
  setShowCreate,
  deleteTarget,
  setDeleteTarget,
  storage,
  openChannel,
  refresh,
  upsertTask,
  setNotice,
  showError,
  handleChannelDeleted,
  applyStorage,
}: AppModalsProps) {
  if (!showCreate && !deleteTarget && (!storage || storage.configured)) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      {storage && !storage.configured ? (
        <StorageSetupModal
          storage={storage}
          onSaved={async (next) => {
            await applyStorage(next);
            setNotice({ tone: "good", message: "Content storage is ready" });
          }}
          onError={showError}
        />
      ) : null}

      {showCreate ? (
        <CreateChannelModal
          initialGroupId={showCreate}
          onClose={() => setShowCreate(null)}
          onCreated={async (channelId, message, task) => {
            if (task) upsertTask(task);
            setShowCreate(null);
            await refresh();
            openChannel(channelId);
            setNotice({ tone: "good", message });
          }}
          onError={showError}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteChannelModal
          channel={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleChannelDeleted}
          onError={showError}
        />
      ) : null}
    </Suspense>
  );
}
