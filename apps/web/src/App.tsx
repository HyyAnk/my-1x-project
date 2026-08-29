import { api } from "./api";
import { Sidebar, Topbar, NoticeBanner } from "./components/AppChrome";
import { TaskActivityBar } from "./components/TaskPanel";
import { AppModals } from "./components/AppModals";
import { AppViewRouter } from "./components/AppViewRouter";
import { useAppOrchestration } from "./hooks/useAppOrchestration";
import { Power } from "@phosphor-icons/react";
import { LanguageProvider } from "./i18n";

function AppContent() {
  const orchestrator = useAppOrchestration();
  const {
    page,
    selectedChannelId,
    selectedEpisodeId,
    tab,
    group,
    openPage,
    openChannel,
    openEpisode,
    setQueryParam,
    git,
    appConfig,
    activeEngine,
    currentModel,
    currentImageModel,
    models,
    loadingModels,
    modelsError,
    codex,
    antigravity,
    antigravityStatus,
    currentEngineStatus,
    storage,
    showCreate,
    setShowCreate,
    deleteTarget,
    setDeleteTarget,
    notice,
    setNotice,
    loading,
    stopped,
    theme,
    setTheme,
    simplifyMode,
    handleSimplifyToggle,
    imageBalance,
    voiceMetrics,
    loadingBalance,
    balanceError,
    fetchBalance,
    channels,
    setChannels,
    refreshChannels,
    tasks,
    activeTasks,
    activeEpisodeTasks,
    taskClock,
    codexStatus,
    realtimeStatus,
    upsertTask,
    setCodexStatus,
    refreshTasks,
    loadModelsForEngine,
    refresh,
    selectedChannel,
    handleCloseNotice,
    showError,
    showGood,
    requestDeleteChannel,
    requestCreateChannel,
    handleChannelDeleted,
    applyStorage,
    setCodex,
    setAntigravity,
    setAppConfig,
    handleEngineToggle,
    handleModelChange,
    handleImageModelChange,
    stopDashboard,
  } = orchestrator;

  const navigate = (next: string) => openPage(next as Parameters<typeof openPage>[0]);

  if (stopped)
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

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={openPage}
        activeTaskCount={activeEpisodeTasks.length}
        tasks={tasks}
        channels={channels}
        onCancelTask={async (taskId) => {
          try {
            await api.cancelTask(taskId);
            setNotice({ tone: "good", message: "Task cancelled from queue" });
            await refreshTasks();
          } catch (err) {
            setNotice({ tone: "bad", message: err instanceof Error ? err.message : "Failed to cancel task" });
          }
        }}
        onOpenEpisode={openEpisode}
        balanceInfo={imageBalance}
        loadingBalance={loadingBalance}
        balanceError={balanceError}
        onRefreshBalance={fetchBalance}
        onOpenSettings={() => {
          openPage("settings");
          setQueryParam("tab", "media");
        }}
        onCreateChannel={() => requestCreateChannel("quiz")}
      />
      <main className="main-column">
        <Topbar
          channel={selectedChannel}
          channels={channels}
          onSelectChannel={(chId) => openChannel(chId)}
          activeEngine={activeEngine}
          engineStatus={currentEngineStatus}
          git={git}
          currentModel={currentModel}
          models={models}
          loadingModels={loadingModels}
          modelsError={modelsError}
          currentImageModel={currentImageModel}
          hasImageApiKey={Boolean(appConfig?.image_generation?.has_api_key || appConfig?.image_generation?.api_key)}
          theme={theme}
          onEngineToggle={handleEngineToggle}
          onThemeToggle={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          onModelChange={handleModelChange}
          onImageModelChange={handleImageModelChange}
          onOpenImageSettings={() => navigate("settings")}
          onReconnect={async () => {
            try {
              if (activeEngine === "antigravity") {
                await loadModelsForEngine("antigravity");
                antigravityStatus;
                showGood("Antigravity checked");
              } else {
                const result = await api.reconnectCodex();
                setCodexStatus(result.status);
                if (result.status === "connected") showGood("Codex connected");
                else showError(new Error(result.message || "Codex unavailable"));
              }
            } catch (error) {
              showError(error);
            }
          }}
          onShutdown={() => void stopDashboard()}
        />
        {page !== "tasks" && !selectedEpisodeId && (
          <TaskActivityBar
            tasks={activeEpisodeTasks}
            realtimeStatus={realtimeStatus}
            now={taskClock}
            onOpenTasks={() => navigate("tasks")}
            onOpenEpisode={openEpisode}
          />
        )}
        <AppViewRouter
          loading={loading}
          page={page}
          channels={channels}
          selectedChannel={selectedChannel}
          selectedEpisodeId={selectedEpisodeId}
          tasks={tasks}
          activeTasks={activeTasks}
          taskClock={taskClock}
          appConfig={appConfig}
          activeEngine={activeEngine}
          currentModel={currentModel}
          currentImageModel={currentImageModel}
          imageBalance={imageBalance}
          voiceMetrics={voiceMetrics}
          storage={storage}
          git={git}
          currentEngineStatus={currentEngineStatus}
          tab={tab}
          group={group}
          simplifyMode={simplifyMode}
          codex={codex}
          codexStatus={codexStatus}
          antigravity={antigravity}
          antigravityStatus={antigravityStatus}
          openPage={openPage}
          openChannel={openChannel}
          openEpisode={openEpisode}
          setQueryParam={setQueryParam}
          upsertTask={upsertTask}
          requestCreateChannel={requestCreateChannel}
          requestDeleteChannel={requestDeleteChannel}
          refresh={refresh}
          refreshChannels={refreshChannels}
          setNotice={setNotice}
          applyStorage={applyStorage}
          setCodex={setCodex}
          setAntigravity={setAntigravity}
          setAppConfig={setAppConfig}
          setChannels={setChannels}
          fetchBalance={fetchBalance}
          handleSimplifyToggle={handleSimplifyToggle}
        />
        <footer className="app-credit">
          <span className="app-credit-full">Develop - Design - Deliver by HyyAnk | Dư Ngọc Minh Hoàng</span>
          <span className="app-credit-mobile">HyyAnk | Dư Ngọc Minh Hoàng</span>
        </footer>
      </main>
      <AppModals
        showCreate={showCreate}
        setShowCreate={setShowCreate}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        storage={storage}
        openChannel={openChannel}
        refresh={refresh}
        upsertTask={upsertTask}
        setNotice={setNotice}
        showError={showError}
        handleChannelDeleted={handleChannelDeleted}
        applyStorage={applyStorage}
      />
      {notice ? <NoticeBanner notice={notice} onClose={handleCloseNotice} /> : null}
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
