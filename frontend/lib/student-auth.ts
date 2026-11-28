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

export type StudentActivityEvent =
  | "session_started" | "dashboard_viewed" | "messages_viewed" | "classes_viewed"
  | "weekly_plan_viewed" | "reports_viewed" | "calendar_viewed" | "invoices_viewed"
  | "notifications_viewed" | "application_submitted" | "message_sent"
  | "report_submitted" | "task_completed";

export interface StudentNotification {
  id: number; category: string; title: string; body: string;
  href: string; created_at: string; read_at: string | null;
}
export interface StudentNotificationsResponse {
  items: StudentNotification[]; total: number; unread_count: number;
}

export const STUDENT_SESSION_INVALID_EVENT = "chekad:student-session-invalid";

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
      credentials: "include",
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
      const credentialFlow = new Set([
        "/auth/student/login",
        "/auth/student/register",
        "/auth/student/me",
        "/auth/student/logout",
      ]);
      if (
        typeof window !== "undefined" &&
        !credentialFlow.has(path.split("?")[0])
      ) {
        window.dispatchEvent(new Event(STUDENT_SESSION_INVALID_EVENT));
      }
      const isLoginRequest = path === "/auth/student/login";
      throw new StudentAuthError(
        isLoginRequest
          ? "شماره همراه یا رمز عبور صحیح نیست."
          : "نشست دانش‌آموزی معتبر نیست یا منقضی شده است. دوباره وارد حساب شوید.",
        response.status,
      );
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
export async function fetchStudentNotifications() {
  return requestJson<StudentNotificationsResponse>("/application/student/notifications");
}
export async function markStudentNotificationRead(id: number) {
  return requestJson<StudentNotification>("/application/student/notifications/" + id + "/read", { method: "PATCH" });
}
export async function markAllStudentNotificationsRead() {
  return requestJson<{ updated: number }>("/application/student/notifications/read-all", { method: "POST" });
}
export async function recordStudentActivity(eventType: StudentActivityEvent) {
  return requestJson<{ recorded: boolean; deduplicated?: boolean }>("/application/student/activities", {
    method: "POST", body: JSON.stringify({ event_type: eventType }),
  });
}
export async function logoutStudent() {
  return requestJson<{ message: string }>("/auth/student/logout", { method: "POST" });
}


export interface PortalMessageThread {
  id: number;
  channel: "support" | "advisor" | "teacher";
  tutor_assignment_id?: number | null;
  advisor_assignment_id?: number | null;
  subject: string;
  status: "open" | "closed";
  last_message_at: string;
  unread_count?: number;
}
export interface PortalMessage {
  id: number;
  sender_type: "student" | "admin" | "mentor" | "teacher";
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
  category: "mentorship" | "tutoring" | "study" | "exam";
  title: string;
  starts_at: string;
  duration_minutes?: number | null;
  status: string;
}
export interface StudentClassRecord {
  assignment_id: number;
  kind: "mentorship" | "tutoring";
  title: string;
  topic: string;
  person_name?: string | null;
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
export async function fetchStudentSchedule() {
  const result = await requestJson<{ items: StudentScheduleEvent[]; total: number }>("/application/student/schedule");
  return { ...result, fetched_at: new Date().toISOString() };
}
export async function fetchStudentClasses() {
  return requestJson<{ items: StudentClassRecord[]; total: number }>("/application/student/classes");
}


export interface StudentInvoice {
  id: number;
  invoice_number: string;
  service_type: "mentorship" | "tutoring" | "other";
  application_id?: number | null;
  title: string;
  description?: string | null;
  amount_toman: number;
  due_date?: string | null;
  status: "issued" | "paid" | "void" | "overdue";
  payment_instructions?: string | null;
  paid_at?: string | null;
  created_at: string;
}

export async function checkStudentAdvisorAvailability() {
  return requestJson<{
    available: boolean;
    assignment: { id: number; mentor_name?: string | null; field: OlympiadField } | null;
  }>("/application/student/messages/advisor");
}
export async function createStudentAdvisorThread() {
  return requestJson<PortalMessageThread>("/application/student/messages/advisor", { method: "POST" });
}
export async function fetchStudentInvoices() {
  return requestJson<{ items: StudentInvoice[]; total: number }>("/application/student/invoices");
}


export interface StudentMentorReport {
  id: number;
  week_number: number;
  content: string;
  created_at: string;
  mentor_name?: string | null;
}
export async function fetchStudentMentorReports() {
  return requestJson<{ items: StudentMentorReport[]; total: number }>("/application/student/mentor-reports");
}


export interface AssignedWeeklyTask extends StudentStudyTask {
  student_auth_id: number;
  mentor_assignment_id?: number | null;
  tutor_assignment_id?: number | null;
  assignment_kind: "mentorship" | "tutoring" | "personal";
  source_type: "student" | "mentor" | "teacher";
}

export async function fetchStudentWeeklyPlan(start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return requestJson<{ items: AssignedWeeklyTask[]; total: number }>(
    "/application/student/weekly-plan" + (params.size ? "?" + params.toString() : ""),
  );
}

export async function updateAssignedWeeklyTaskStatus(
  taskId: number,
  status: "completed",
) {
  return requestJson<AssignedWeeklyTask>("/application/student/weekly-plan/" + taskId, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function checkStudentTeacherAvailability() {
  return requestJson<{
    available: boolean;
    assignment: {
      id: number;
      teacher_name?: string | null;
      topic: string;
      field: OlympiadField;
    } | null;
  }>("/application/student/messages/teacher");
}

export async function createStudentTeacherThread() {
  return requestJson<PortalMessageThread>("/application/student/messages/teacher", {
    method: "POST",
  });
}

export function openPortalMessageSocket(
  role: "student" | "mentor" | "teacher" | "admin",
  threadId: number,
  onMessage: (message: PortalMessage) => void,
  onOpen?: () => void,
  onClose?: () => void,
): WebSocket {
  const socketUrl = new URL(
    API_BASE + "/application/" + role + "/messages/threads/" + threadId + "/ws",
    window.location.href,
  );
  socketUrl.protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(socketUrl.toString());
  socket.addEventListener("open", () => onOpen?.());
  socket.addEventListener("close", () => onClose?.());
  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(String(event.data)) as {
        type?: string;
        message?: PortalMessage;
      };
      if (payload.type === "message" && payload.message) onMessage(payload.message);
    } catch {
      // Ignore malformed frames while keeping the connection alive.
    }
  });
  return socket;
}
