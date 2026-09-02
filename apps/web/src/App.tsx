import { api } from "./api";
import { Sidebar, Topbar, NoticeBanner } from "./components/AppChrome";
import { TaskActivityBar } from "./features/tasks/components/TaskActivityBar";
import { AppModals } from "./components/AppModals";
import { AppViewRouter } from "./components/AppViewRouter";
import { useAppOrchestration } from "./hooks/useAppOrchestration";
import { Power } from "@phosphor-icons/react";
import { LanguageProvider } from "./i18n";

function AppContent() {
  const orch = useAppOrchestration();
  const navigate = (next: string) => orch.openPage(next as Parameters<typeof orch.openPage>[0]);

  if (orch.stopped) {
    return (
      <main className="shutdown-screen">
        <div className="shutdown-card">
          <Power size={24} weight="bold" />
          <p className="eyebrow">Local workspace</p>
          <h1>Dashboard stopped</h1>
          <p>
            Run <strong>run dashboard.bat</strong> to start it again. Your channel files are still on this computer.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={orch.page}
        setPage={orch.openPage}
        activeTaskCount={orch.activeEpisodeTasks.length}
        tasks={orch.tasks}
        channels={orch.channels}
        onCancelTask={async (taskId) => {
          try {
            await api.cancelTask(taskId);
            orch.setNotice({ tone: "good", message: "Task cancelled from queue" });
            await orch.refreshTasks();
          } catch (err) {
            orch.setNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to cancel task" });
          }
        }}
        onOpenEpisode={orch.openEpisode}
        balanceInfo={orch.imageBalance}
        loadingBalance={orch.loadingBalance}
        balanceError={orch.balanceError}
        onRefreshBalance={orch.fetchBalance}
        onOpenSettings={() => {
          orch.openPage("settings");
          orch.setQueryParam("tab", "media");
        }}
        onCreateChannel={orch.requestCreateChannel}
      />
      <main className="main-column">
        <Topbar
          channel={orch.selectedChannel}
          channels={orch.channels}
          onSelectChannel={(chId) => orch.openChannel(chId)}
          activeEngine={orch.activeEngine}
          engineStatus={orch.currentEngineStatus}
          git={orch.git}
          currentModel={orch.currentModel}
          models={orch.models}
          loadingModels={orch.loadingModels}
          modelsError={orch.modelsError}
          currentImageModel={orch.currentImageModel}
          hasImageApiKey={Boolean(orch.appConfig?.image_generation?.has_api_key || orch.appConfig?.image_generation?.api_key)}
          theme={orch.theme}
          onEngineToggle={orch.handleEngineToggle}
          onThemeToggle={() => orch.setTheme((current) => (current === "dark" ? "light" : "dark"))}
          onModelChange={orch.handleModelChange}
          onImageModelChange={orch.handleImageModelChange}
          onOpenImageSettings={() => navigate("settings")}
          onReconnect={async () => {
            try {
              if (orch.activeEngine === "antigravity") {
                await orch.loadModelsForEngine("antigravity");
                orch.showGood("Antigravity checked");
              } else {
                const result = await api.reconnectCodex();
                orch.setCodexStatus(result.status);
                if (result.status === "connected") orch.showGood("Codex connected");
                else orch.showError(new Error(result.message || "Codex unavailable"));
              }
            } catch (error) {
              orch.showError(error);
            }
          }}
          onShutdown={() => void orch.stopDashboard()}
        />
        {orch.page !== "tasks" && !orch.selectedEpisodeId && (
          <TaskActivityBar
            tasks={orch.activeEpisodeTasks}
            realtimeStatus={orch.realtimeStatus}
            now={orch.taskClock}
            onOpenTasks={() => navigate("tasks")}
            onOpenEpisode={orch.openEpisode}
          />
        )}
        <AppViewRouter
          loading={orch.loading}
          page={orch.page}
          channels={orch.channels}
          selectedChannel={orch.selectedChannel}
          selectedEpisodeId={orch.selectedEpisodeId}
          tasks={orch.tasks}
          activeTasks={orch.activeTasks}
          taskClock={orch.taskClock}
          appConfig={orch.appConfig}
          activeEngine={orch.activeEngine}
          currentModel={orch.currentModel}
          currentImageModel={orch.currentImageModel}
          imageBalance={orch.imageBalance}
          voiceMetrics={orch.voiceMetrics}
          usageLedger={orch.usageLedger}
          storage={orch.storage}
          git={orch.git}
          currentEngineStatus={orch.currentEngineStatus}
          tab={orch.tab}
          simplifyMode={orch.simplifyMode}
          codex={orch.codex}
          codexStatus={orch.codexStatus}
          antigravity={orch.antigravity}
          antigravityStatus={orch.antigravityStatus}
          openPage={orch.openPage}
          openChannel={orch.openChannel}
          openEpisode={orch.openEpisode}
          setQueryParam={orch.setQueryParam}
          upsertTask={orch.upsertTask}
          requestCreateChannel={orch.requestCreateChannel}
          requestDeleteChannel={orch.requestDeleteChannel}
          refresh={orch.refresh}
          refreshChannels={orch.refreshChannels}
          setNotice={orch.setNotice}
          applyStorage={orch.applyStorage}
          setCodex={orch.setCodex}
          setAntigravity={orch.setAntigravity}
          setAppConfig={orch.setAppConfig}
          setChannels={orch.setChannels}
          fetchBalance={orch.fetchBalance}
          handleSimplifyToggle={orch.handleSimplifyToggle}
        />
        <footer className="app-credit">
          <span className="app-credit-full">Develop - Design - Deliver by HyyAnk | Dư Ngọc Minh Hoàng</span>
          <span className="app-credit-mobile">HyyAnk | Dư Ngọc Minh Hoàng</span>
        </footer>
      </main>
      <AppModals
        showCreate={orch.showCreate}
        setShowCreate={orch.setShowCreate}
        deleteTarget={orch.deleteTarget}
        setDeleteTarget={orch.setDeleteTarget}
        storage={orch.storage}
        openChannel={orch.openChannel}
        refresh={orch.refresh}
        upsertTask={orch.upsertTask}
        setNotice={orch.setNotice}
        showError={orch.showError}
        handleChannelDeleted={orch.handleChannelDeleted}
        applyStorage={orch.applyStorage}
      />
      {orch.notice ? <NoticeBanner notice={orch.notice} onClose={orch.handleCloseNotice} /> : null}
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
