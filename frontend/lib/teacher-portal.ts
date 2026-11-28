import { openPortalMessageSocket, type PortalMessage } from "./student-auth";

export interface TeacherAssignment {
  id: number;
  application_id: number;
  student_name: string;
  student_auth_id?: number | null;
  grade?: string | null;
  field: "physics" | "computer";
  topic: string;
  status: "active" | "completed";
  start_date: string;
  end_date?: string | null;
  person_name?: string | null;
}
export interface TeacherThread {
  id: number;
  channel: "teacher";
  subject: string;
  student_name: string;
  status: "open" | "closed";
  last_message_at: string;
  unread_count: number;
  field: "physics" | "computer";
  topic: string;
}
export interface TeacherWeeklyTask {
  id: number;
  student_auth_id: number;
  title: string;
  description?: string | null;
  planned_at: string;
  duration_minutes: number;
  status: "pending" | "completed" | "skipped";
}
export class TeacherPortalError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TeacherPortalError";
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
    throw new TeacherPortalError("ارتباط با پنل مدرس برقرار نشد.");
  }
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    throw new TeacherPortalError(
      detail || (response.status === 401 ? "نشست مدرس معتبر نیست." : "درخواست انجام نشد."),
      response.status,
    );
  }
  return data as T;
}
export async function fetchTeacherAssignments() {
  return request<{ items: TeacherAssignment[]; total: number }>("/teacher/assignments");
}
export async function fetchTeacherThreads() {
  return request<{ items: TeacherThread[]; total: number }>("/teacher/messages/threads");
}
export async function fetchTeacherThreadMessages(threadId: number) {
  return request<{ items: PortalMessage[]; total: number }>("/teacher/messages/threads/" + threadId + "/messages");
}
export async function sendTeacherMessage(threadId: number, body: string) {
  return request<PortalMessage>("/teacher/messages/threads/" + threadId + "/messages", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
export function openTeacherMessageSocket(threadId: number, onMessage: (message: PortalMessage) => void, onClose?: () => void) {
  return openPortalMessageSocket("teacher", threadId, onMessage, undefined, onClose);
}
export async function fetchTeacherWeeklyPlan(assignmentId: number, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return request<{ items: TeacherWeeklyTask[]; total: number }>(
    "/teacher/assignments/" + assignmentId + "/weekly-plan" + (params.size ? "?" + params.toString() : ""),
  );
}
export async function createTeacherWeeklyTask(assignmentId: number, payload: {
  title: string; description?: string; planned_at: string; duration_minutes: number;
}) {
  return request<TeacherWeeklyTask>("/teacher/assignments/" + assignmentId + "/weekly-plan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function updateTeacherWeeklyTask(assignmentId: number, taskId: number, payload: Partial<{
  title: string; description: string; planned_at: string; duration_minutes: number;
}>) {
  return request<TeacherWeeklyTask>("/teacher/assignments/" + assignmentId + "/weekly-plan/" + taskId, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export async function deleteTeacherWeeklyTask(assignmentId: number, taskId: number) {
  return request<{ deleted: boolean }>("/teacher/assignments/" + assignmentId + "/weekly-plan/" + taskId, {
    method: "DELETE",
  });
}
