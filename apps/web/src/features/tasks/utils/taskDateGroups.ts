import type { ProductionItemSummary } from "../types";

export type TaskDateGroup = {
  key: string;
  label: string;
  items: ProductionItemSummary[];
};

export function groupTaskItemsByDate(
  items: ProductionItemSummary[],
  nowMs: number,
  locale: string | string[] | undefined = undefined,
): TaskDateGroup[] {
  const sorted = [...items].sort((left, right) => activityTime(right) - activityTime(left));
  const groups = new Map<string, ProductionItemSummary[]>();

  for (const item of sorted) {
    const key = localDateKey(new Date(activityTime(item)));
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()].map(([key, groupItems]) => ({
    key,
    label: formatDateGroupLabel(key, nowMs, locale),
    items: groupItems,
  }));
}

function activityTime(item: ProductionItemSummary): number {
  const timestamp = Date.parse(item.completedAt || item.startedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateGroupLabel(key: string, nowMs: number, locale: string | string[] | undefined): string {
  const today = new Date(nowMs);
  const yesterday = new Date(nowMs);
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === localDateKey(today)) return "Today";
  if (key === localDateKey(yesterday)) return "Yesterday";

  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}
