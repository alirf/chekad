import type { OlympiadField } from "./student-auth";

export interface StudentExam {
  id: number;
  slug: string;
  title: string;
  description: string;
  field: OlympiadField;
  stage: string;
  starts_at: string;
  duration_minutes: number;
  registration_url?: string | null;
  status: "published" | "upcoming" | "closed" | "completed";
  cover_image_url?: string | null;
  registration_status?: "registered" | "cancelled" | null;
  is_registered: boolean;
  can_register: boolean;
  registered_at?: string | null;
}

export class StudentExamError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "StudentExamError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/content" + path, {
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
    throw new StudentExamError("ارتباط با سرویس آزمون برقرار نشد.");
  }
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    const fallback: Record<number, string> = {
      401: "برای مشاهده و ثبت‌نام آزمون وارد حساب دانش‌آموزی شو.",
      403: "این آزمون برای رشته المپیاد حساب تو نیست.",
      404: "آزمون پیدا نشد.",
      409: "مهلت ثبت‌نام این آزمون فعال نیست.",
      422: "اطلاعات درخواست معتبر نیست.",
      429: "تعداد درخواست‌ها زیاد بوده است. کمی بعد دوباره تلاش کن.",
    };
    throw new StudentExamError(detail || fallback[response.status] || "درخواست آزمون انجام نشد.", response.status);
  }
  return data as T;
}

export async function fetchStudentExams() {
  return request<{ items: StudentExam[]; total: number }>("/student/exams");
}
export async function registerForExam(examId: number) {
  return request<{ id: number; exam_id: number; status: "registered"; registered_at: string }>(
    "/student/exams/" + examId + "/register",
    { method: "POST" },
  );
}
export async function cancelExamRegistration(examId: number) {
  return request<{ exam_id: number; status: "cancelled" }>(
    "/student/exams/" + examId + "/register",
    { method: "DELETE" },
  );
}


export interface StudentExamQuestion {
  id: number;
  position: number;
  question_type: "single_choice" | "written";
  prompt: string;
  options?: string[] | null;
  points: number;
  answer_text?: string;
}

export interface StudentExamAttempt {
  id: number;
  exam_id: number;
  exam_title?: string;
  status: "in_progress" | "submitted" | "graded";
  started_at: string;
  deadline_at: string;
  submitted_at?: string | null;
  max_score: number;
  earned_score?: number | null;
  results_published: boolean;
  questions?: StudentExamQuestion[];
}

export interface StudentExamResult {
  exam_id: number;
  exam_title: string;
  attempt_id: number;
  submitted_at: string;
  earned_score: number;
  max_score: number;
  percentage: number;
  answers: Array<{
    question_id: number;
    position: number;
    prompt: string;
    answer_text: string;
    is_correct?: boolean | null;
    earned_points?: number | null;
    max_points: number;
    grader_note?: string | null;
    correct_answer?: string | null;
  }>;
}

export async function fetchStudentExamCalendar() {
  return request<{ items: import("./student-auth").StudentScheduleEvent[]; total: number }>("/student/calendar");
}
export async function startStudentExam(examId: number) {
  return request<StudentExamAttempt>("/student/exams/" + examId + "/attempt/start", { method: "POST" });
}
export async function fetchStudentExamAttempt(examId: number) {
  return request<StudentExamAttempt>("/student/exams/" + examId + "/attempt");
}
export async function saveStudentExamAnswers(
  examId: number,
  answers: Array<{ question_id: number; answer_text: string }>,
) {
  return request<{ saved: number; saved_at: string }>("/student/exams/" + examId + "/attempt/answers", {
    method: "PUT",
    body: JSON.stringify({ answers }),
  });
}
export async function submitStudentExam(examId: number) {
  return request<{
    status: "submitted" | "graded";
    submitted_at: string;
    results_published: boolean;
  }>("/student/exams/" + examId + "/attempt/submit", { method: "POST" });
}
export async function fetchStudentExamResult(examId: number) {
  return request<StudentExamResult>("/student/exams/" + examId + "/result");
}
