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
