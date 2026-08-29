export function formatRelativeTime(dateString: string, t?: (key: string, params?: Record<string, string | number>) => string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return t ? t("channels.updatedJustNow") : "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return t ? t("channels.updatedAgo", { time: `${diffMin}m` }) : `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t ? t("channels.updatedAgo", { time: `${diffHour}h` }) : `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 30) return t ? t("channels.updatedAgo", { time: `${diffDays}d` }) : `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return t ? t("channels.updatedAgo", { time: `${diffMonths}mo` }) : `${diffMonths}mo ago`;
  } catch {
    return "";
  }
}
