export interface MentorAssignment {
  id: number;
  application_id: number;
  student_name: string;
  student_auth_id?: number | null;
  grade?: string | null;
  field: "physics" | "computer";
  status: "active" | "completed";
  start_date: string;
  end_date?: string | null;
  person_name?: string | null;
}
export interface StudentStudyReport {
  id: number;
  report_date: string;
  study_minutes: number;
  topics: string;
  summary: string;
  blockers?: string | null;
  next_step?: string | null;
  created_at: string;
}
export interface MentorWeeklyReport {
  id: number;
  week_number: number;
  content: string;
  created_at: string;
}
export class MentorPortalError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "MentorPortalError";
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/application" + path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new MentorPortalError("ارتباط با سرویس پنل مشاور برقرار نشد.");
  }
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    if (response.status === 401) throw new MentorPortalError(detail || "نشست مشاور معتبر نیست.", 401);
    throw new MentorPortalError(detail || "درخواست انجام نشد.", response.status);
  }
  return data as T;
}

export async function fetchMentorAssignments() {
  return request<{ items: MentorAssignment[]; total: number }>("/mentor/assignments");
}
export async function fetchAssignedStudentStudyReports(assignmentId: number) {
  return request<{ items: StudentStudyReport[]; total: number }>("/mentor/assignments/" + assignmentId + "/study-reports");
}
export async function fetchMentorWeeklyReports(assignmentId: number) {
  return request<{ items: MentorWeeklyReport[]; total: number }>("/mentor/assignments/" + assignmentId + "/weekly-reports");
}
export async function createMentorWeeklyReport(assignmentId: number, weekNumber: number, content: string) {
  return request<MentorWeeklyReport>("/mentor/assignments/" + assignmentId + "/weekly-reports", {
    method: "POST",
    body: JSON.stringify({ week_number: weekNumber, content }),
  });
}
