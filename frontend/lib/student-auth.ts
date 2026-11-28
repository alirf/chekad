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
