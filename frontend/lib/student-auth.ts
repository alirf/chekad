export type OlympiadField = "physics" | "computer";
export type StudentGrade = "دهم" | "یازدهم" | "دوازدهم";

export interface StudentProfile {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  guardian_phone: string;
  grade: StudentGrade;
  field: OlympiadField;
  phone_verified: boolean;
}

export interface StudentRegisterPayload {
  first_name: string;
  last_name: string;
  phone: string;
  guardian_phone: string;
  grade: StudentGrade;
  field: OlympiadField;
  password: string;
  guardian_consent: true;
  privacy_accepted: true;
}

export interface StudentApplication {
  id: number;
  kind: "mentorship" | "tutoring";
  tracking_code: string;
  title: string;
  field: OlympiadField;
  status: string;
  created_at: string;
  updated_at: string;
  details?: string | null;
}

export interface StudentService {
  key: string;
  title: string;
  description: string;
  href: string;
  action_label: string;
  availability: "available" | "catalog";
  note?: string | null;
}

export class StudentAuthError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "StudentAuthError";
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "/api").replace(/\/$/, "");

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new StudentAuthError("ارتباط با سرور برقرار نشد. اتصال را بررسی و دوباره تلاش کنید.");
  }

  const result = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const detail = typeof result.detail === "string" ? result.detail : "";
    if (response.status === 401) {
      throw new StudentAuthError("شماره همراه یا رمز عبور صحیح نیست.", response.status);
    }
    if (response.status === 409) {
      throw new StudentAuthError(detail || "این شماره همراه قبلاً ثبت شده است.", response.status);
    }
    if (response.status === 422) {
      throw new StudentAuthError("اطلاعات واردشده معتبر نیست. فرم را بررسی کنید.", response.status);
    }
    if (response.status === 429) {
      throw new StudentAuthError("تعداد تلاش‌ها زیاد بوده است. کمی بعد دوباره تلاش کنید.", response.status);
    }
    if (response.status === 503) {
      throw new StudentAuthError(detail || "این خدمت در حال حاضر فعال نیست.", response.status);
    }
    throw new StudentAuthError(detail || "درخواست انجام نشد. دوباره تلاش کنید.", response.status);
  }
  return result as T;
}

export async function registerStudent(payload: StudentRegisterPayload) {
  return requestJson<{ student: StudentProfile; expires_in: number }>("/auth/student/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginStudent(phone: string, password: string) {
  return requestJson<{ student: StudentProfile; expires_in: number }>("/auth/student/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}

export async function fetchStudentProfile() {
  return requestJson<StudentProfile>("/auth/student/me");
}

export async function fetchStudentServices() {
  return requestJson<StudentService[]>("/auth/student/services");
}


export async function fetchStudentApplications() {
  return requestJson<{ items: StudentApplication[]; total: number }>("/application/student/applications");
}
export async function logoutStudent() {
  return requestJson<{ message: string }>("/auth/student/logout", { method: "POST" });
}


export interface PortalMessageThread {
  id: number;
  channel: "support" | "advisor";
  subject: string;
  status: "open" | "closed";
  last_message_at: string;
  unread_count?: number;
}
export interface PortalMessage {
  id: number;
  sender_type: "student" | "admin";
  sender_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
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
export interface StudentStudyTask {
  id: number;
  title: string;
  description?: string | null;
  planned_at: string;
  duration_minutes: number;
  status: "pending" | "completed" | "skipped";
  created_at: string;
  updated_at: string;
}
export interface StudentScheduleEvent {
  id: string;
  category: "mentorship" | "tutoring" | "study";
  title: string;
  starts_at: string;
  duration_minutes?: number | null;
  status: string;
}
export interface StudentClassRecord {
  assignment_id: number;
  topic: string;
  field: OlympiadField;
  status: string;
  start_date: string;
  end_date?: string | null;
  sessions: Array<{
    id: number;
    session_number: number;
    scheduled_at?: string | null;
    duration_minutes?: number | null;
    status: string;
  }>;
}

export async function fetchStudentMessageThreads() {
  return requestJson<{ items: PortalMessageThread[]; total: number }>("/application/student/messages/threads");
}
export async function createStudentMessageThread(subject: string) {
  return requestJson<PortalMessageThread>("/application/student/messages/threads", {
    method: "POST",
    body: JSON.stringify({ subject }),
  });
}
export async function fetchStudentThreadMessages(threadId: number) {
  return requestJson<{ items: PortalMessage[]; total: number }>("/application/student/messages/threads/" + threadId + "/messages");
}
export async function sendStudentMessage(threadId: number, body: string) {
  return requestJson<PortalMessage>("/application/student/messages/threads/" + threadId + "/messages", {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}
export async function fetchStudentReports() {
  return requestJson<{ items: StudentStudyReport[]; total: number }>("/application/student/reports");
}
export async function createStudentReport(payload: Omit<StudentStudyReport, "id" | "created_at">) {
  return requestJson<{ id: number; created_at: string }>("/application/student/reports", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function fetchStudentStudyTasks(start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const suffix = params.toString() ? "?" + params.toString() : "";
  return requestJson<{ items: StudentStudyTask[]; total: number }>("/application/student/study-tasks" + suffix);
}
export async function createStudentStudyTask(payload: {
  title: string;
  description?: string;
  planned_at: string;
  duration_minutes: number;
}) {
  return requestJson<StudentStudyTask>("/application/student/study-tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function updateStudentStudyTask(taskId: number, payload: Partial<Pick<StudentStudyTask, "title" | "description" | "planned_at" | "duration_minutes" | "status">>) {
  return requestJson<StudentStudyTask>("/application/student/study-tasks/" + taskId, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export async function deleteStudentStudyTask(taskId: number) {
  return requestJson<void>("/application/student/study-tasks/" + taskId, { method: "DELETE" });
}
export async function fetchStudentSchedule() {
  return requestJson<{ items: StudentScheduleEvent[]; total: number }>("/application/student/schedule");
}
export async function fetchStudentClasses() {
  return requestJson<{ items: StudentClassRecord[]; total: number }>("/application/student/classes");
}
