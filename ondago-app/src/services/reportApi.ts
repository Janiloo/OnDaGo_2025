import { client, normalizeId } from "./client";
import { ReportItem } from "../types";

/** Normalizes a raw API/SignalR report payload (handles both JSON casings). */
export function normalizeReport(r: any): ReportItem {
  return {
    id: normalizeId(r.id ?? r.Id),
    userId: r.userId ?? r.UserId ?? null,
    subject: r.subject ?? r.Subject ?? "",
    description: r.description ?? r.Description ?? "",
    status: r.status ?? r.Status ?? "Pending",
    isImportant: Boolean(r.isImportant ?? r.IsImportant ?? false),
    createdAt: r.createdAt ?? r.CreatedAt ?? "",
    completedAt: r.completedAt ?? r.CompletedAt ?? null,
    deletedAt: r.deletedAt ?? r.DeletedAt ?? null,
  };
}

export async function getReports(): Promise<ReportItem[]> {
  const { data } = await client.get("/api/Reports");
  if (!Array.isArray(data)) return [];
  return data.map(normalizeReport).filter((r) => !r.deletedAt);
}

export async function createReport(input: {
  userId?: string | null;
  subject: string;
  description: string;
}): Promise<void> {
  await client.post("/api/Reports", {
    userId: input.userId ?? null,
    subject: input.subject,
    description: input.description,
    status: "Pending",
    isImportant: false,
  });
}

/** Admin: set the report status (e.g. "InProgress", "Pending"). */
export async function updateReportStatus(id: string, status: string): Promise<void> {
  await client.patch(`/api/Reports/${id}/status`, { status });
}

/** Admin: mark a report important or not. */
export async function setReportImportant(id: string, important: boolean): Promise<void> {
  await client.patch(`/api/Reports/${id}/important`, { isImportant: important });
}

/** Admin: mark a report completed (sets CompletedAt server-side). */
export async function markReportCompleted(id: string): Promise<void> {
  await client.patch(`/api/Reports/${id}/completed`);
}

/** Admin: soft-delete a report (hidden everywhere, retained for audit). */
export async function deleteReport(id: string): Promise<void> {
  await client.delete(`/api/Reports/${id}`);
}
