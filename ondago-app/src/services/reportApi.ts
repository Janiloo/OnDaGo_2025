import { client, normalizeId } from "./client";
import { ReportItem } from "../types";

export async function getReports(): Promise<ReportItem[]> {
  const { data } = await client.get("/api/Reports");
  if (!Array.isArray(data)) return [];
  return data
    .map((r: any) => ({
      id: normalizeId(r.id ?? r.Id),
      userId: r.userId ?? r.UserId ?? null,
      subject: r.subject ?? r.Subject ?? "",
      description: r.description ?? r.Description ?? "",
      status: r.status ?? r.Status ?? "Pending",
      isImportant: Boolean(r.isImportant ?? r.IsImportant ?? false),
      createdAt: r.createdAt ?? r.CreatedAt ?? "",
      deletedAt: r.deletedAt ?? r.DeletedAt ?? null,
    }))
    .filter((r) => !r.deletedAt);
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

export async function updateReportStatus(id: string, status: string): Promise<void> {
  // Endpoint binds [FromBody] string, so the body is a bare JSON string.
  await client.patch(`/api/Reports/${id}/status`, JSON.stringify(status));
}

export async function markReportImportant(id: string): Promise<void> {
  await client.patch(`/api/Reports/${id}/important`);
}

export async function markReportCompleted(id: string): Promise<void> {
  await client.patch(`/api/Reports/${id}/completed`);
}

export async function deleteReport(id: string): Promise<void> {
  await client.delete(`/api/Reports/${id}`);
}
