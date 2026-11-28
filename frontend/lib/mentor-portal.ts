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
function apiErrorMessage(detail: unknown): string {
  if (typeof detail === "string" && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const labels: Record<string, string> = {
      title: "عنوان",
      description: "توضیح",
      planned_at: "تاریخ و ساعت",
      duration_minutes: "مدت فعالیت",
    };
    const messages = detail.map((entry) => {
      if (!entry || typeof entry !== "object") return "";
      const error = entry as Record<string, unknown>;
      const location = Array.isArray(error.loc)
        ? error.loc.filter((part) => typeof part === "string" || typeof part === "number").slice(1).map(String)
        : [];
      const field = location.length ? location[location.length - 1] : "";
      const label = labels[field] || field;
      const message = typeof error.msg === "string" ? error.msg : "";
      return message ? (label ? label + ": " + message : message) : "";
    }).filter(Boolean);
    if (messages.length) return messages.join("؛ ");
  }

  return "";
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
  const data: unknown = await response.json().catch(() => ({}));
  const detail = data && typeof data === "object" && "detail" in data
    ? (data as { detail?: unknown }).detail
    : undefined;
  if (!response.ok) {
    const message = apiErrorMessage(detail);
    if (response.status === 401) throw new MentorPortalError(message || "نشست مشاور معتبر نیست.", 401);
    throw new MentorPortalError(message || "درخواست انجام نشد.", response.status);
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


export interface ManagedStudyTask {
  id: number;
  student_auth_id: number;
  mentor_assignment_id?: number | null;
  tutor_assignment_id?: number | null;
  assignment_kind: "mentorship" | "tutoring";
  title: string;
  description?: string | null;
  planned_at: string;
  duration_minutes: number;
  status: "pending" | "completed" | "skipped";
  created_at: string;
  updated_at: string;
}
export async function fetchMentorWeeklyPlan(assignmentId: number, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return request<{ items: ManagedStudyTask[]; total: number }>(
    "/mentor/assignments/" + assignmentId + "/weekly-plan" + (params.size ? "?" + params.toString() : ""),
  );
}
export async function createMentorWeeklyTask(assignmentId: number, payload: {
  title: string; description?: string; planned_at: string; duration_minutes: number;
}) {
  return request<ManagedStudyTask>("/mentor/assignments/" + assignmentId + "/weekly-plan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function updateMentorWeeklyTask(assignmentId: number, taskId: number, payload: Partial<{
  title: string; description: string; planned_at: string; duration_minutes: number;
}>) {
  return request<ManagedStudyTask>("/mentor/assignments/" + assignmentId + "/weekly-plan/" + taskId, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export async function deleteMentorWeeklyTask(assignmentId: number, taskId: number) {
  return request<{ deleted: boolean }>("/mentor/assignments/" + assignmentId + "/weekly-plan/" + taskId, {
    method: "DELETE",
  });
}
