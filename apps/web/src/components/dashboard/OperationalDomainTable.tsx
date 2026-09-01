import { Cpu, Image as ImageIcon, SpeakerHigh, VideoCamera } from "@phosphor-icons/react";
import type { Task } from "@studio/shared";
import { useTranslation } from "../../i18n";

export type OperationalDomainTableProps = {
  tasks: Task[];
};

export function OperationalDomainTable({ tasks }: OperationalDomainTableProps) {
  const { t } = useTranslation();

  const categoryStats = [
    {
      domainKey: "domainVisualArt",
      domain: t("dashboard.domainVisualArt"),
      filter: (t: Task) => t.task_type === "GENERATE_BUNDLE_IMAGE",
      icon: ImageIcon,
    },
    {
      domainKey: "domainVoiceTTS",
      domain: t("dashboard.domainVoiceTTS"),
      filter: (t: Task) => t.task_type === "GENERATE_AUDIO",
      icon: SpeakerHigh,
    },
    {
      domainKey: "domainScriptIntelligence",
      domain: t("dashboard.domainScriptIntelligence"),
      filter: (t: Task) =>
        [
          "SUGGEST_TOPICS",
          "GENERATE_RESEARCH",
          "GENERATE_TREATMENT",
          "GENERATE_SCRIPT",
          "GENERATE_VISUAL_BIBLE",
          "GENERATE_SCENES",
          "GENERATE_SEQUENCE_SCENES",
          "GENERATE_PIPELINE",
          "GENERATE_DNA",
          "REGENERATE_DIALOGUE",
          "REGENERATE_PROMPT",
          "REGENERATE_BOTH",
        ].includes(t.task_type),
      icon: Cpu,
    },
    {
      domainKey: "domainVideoComposition",
      domain: t("dashboard.domainVideoComposition"),
      filter: (t: Task) => t.task_type === "GENERATE_VIDEO",
      icon: VideoCamera,
    },
  ].map((cat) => {
    const catTasks = tasks.filter(cat.filter);
    const catCompleted = catTasks.filter((t) => t.status === "COMPLETED").length;
    const catFailed = catTasks.filter((t) => t.status === "FAILED").length;
    const catRunning = catTasks.filter((t) => t.status === "RUNNING").length;
    const catTerminal = catCompleted + catFailed;
    const catRate = catTerminal > 0 ? ((catCompleted / catTerminal) * 100).toFixed(0) : "100";
    return {
      ...cat,
      total: catTasks.length,
      completed: catCompleted,
      failed: catFailed,
      running: catRunning,
      successRate: catRate,
    };
  });

  return (
    <div className="dashboard-table-card">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>{t("dashboard.productionDomain")}</th>
            <th>{t("dashboard.totalRuns")}</th>
            <th>{t("dashboard.running")}</th>
            <th>{t("dashboard.completed")}</th>
            <th>{t("dashboard.failed")}</th>
            <th>{t("dashboard.successRate")}</th>
          </tr>
        </thead>
        <tbody>
          {categoryStats.map((item) => {
            const Icon = item.icon;
            return (
              <tr key={item.domainKey}>
                <td>
                  <div className="table-domain-cell">
                    <Icon size={16} style={{ color: "var(--accent-deep)" }} />
                    <span>{item.domain}</span>
                  </div>
                </td>
                <td className="table-num-cell">{item.total}</td>
                <td className="table-num-cell" style={{ color: item.running ? "var(--accent)" : "inherit" }}>
                  {item.running}
                </td>
                <td className="table-num-cell" style={{ color: "var(--green)" }}>
                  {item.completed}
                </td>
                <td className="table-num-cell" style={{ color: item.failed ? "var(--notice-error)" : "inherit" }}>
                  {item.failed}
                </td>
                <td>
                  <div className="progress-pill-wrap">
                    <div className="progress-mini-bar">
                      <div className="progress-mini-fill" style={{ width: `${item.successRate}%` }} />
                    </div>
                    <span className="table-num-cell" style={{ fontSize: "11px" }}>
                      {item.successRate}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
