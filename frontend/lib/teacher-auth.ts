export interface TeacherProfile {
  id: number;
  tutor_profile_id: number;
  phone: string;
  display_name: string;
}
export class TeacherAuthError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TeacherAuthError";
  }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api/auth" + path, {
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
    throw new TeacherAuthError("ارتباط با سرور برقرار نشد.");
  }
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    throw new TeacherAuthError(
      detail || (response.status === 401 ? "شماره همراه یا رمز عبور صحیح نیست." : "درخواست انجام نشد."),
      response.status,
    );
  }
  return data as T;
}
export async function loginTeacher(phone: string, password: string) {
  return request<{ teacher: TeacherProfile; expires_in: number }>("/teacher/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}
export async function fetchTeacherProfile() {
  return request<TeacherProfile>("/teacher/me");
}
export async function logoutTeacher() {
  return request<{ message: string }>("/teacher/logout", { method: "POST" });
}
