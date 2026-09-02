import type { UsageLedger } from "@studio/shared";
import { request } from "./client";

export const analyticsApi = {
  usageLedger: () => request<UsageLedger>("/api/analytics/usage-ledger"),
  reconcileUsageLedger: () => request<UsageLedger>("/api/analytics/reconcile", { method: "POST" }),
};
