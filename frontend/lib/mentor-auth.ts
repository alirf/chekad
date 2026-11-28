export interface MentorProfile {
  id: number;
  mentor_profile_id: number;
  phone: string;
  display_name: string;
}

export class MentorAuthError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "MentorAuthError";
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
    throw new MentorAuthError("ارتباط با سرور برقرار نشد.");
  }
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    throw new MentorAuthError(
      detail || (response.status === 401 ? "شماره همراه یا رمز عبور صحیح نیست." : "درخواست انجام نشد."),
      response.status,
    );
  }
  return data as T;
}

export async function loginMentor(phone: string, password: string) {
  return request<{ mentor: MentorProfile; expires_in: number }>("/mentor/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
}
export async function fetchMentorProfile() {
  return request<MentorProfile>("/mentor/me");
}
export async function logoutMentor() {
  return request<{ message: string }>("/mentor/logout", { method: "POST" });
}
