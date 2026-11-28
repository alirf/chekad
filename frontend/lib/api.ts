import { STUDENT_SESSION_INVALID_EVENT } from "./student-auth";

export type OlympiadField = "physics" | "computer";
export type PeopleKind = "mentors" | "tutors";

export interface PublicPerson {
  id: number;
  first_name: string;
  last_name: string;
  field: OlympiadField;
  bio?: string | null;
  achievements?: string | null;
  specialties?: string | null;
  experience?: string | null;
  image_url?: string | null;
  medals?: string | null;
  education?: string | null;
}

export interface PublicApplicationPayload {
  first_name: string;
  last_name: string;
  grade: string;
  field: OlympiadField;
  guardian_phone: string;
  guardian_consent: true;
  privacy_accepted: true;
  goal?: string;
  notes?: string;
  level?: string;
  topic?: string;
}

export interface PublicApplicationResult {
  request_id: number;
  status: "received";
  message: string;
}

export type ApiFailureKind = "http" | "network" | "invalid-response";

export class ApiError extends Error {
  readonly kind: ApiFailureKind;
  readonly status?: number;

  constructor(message: string, kind: ApiFailureKind, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "/api").replace(/\/$/, "");

const pendingApplicationKeys = new Map<string, string>();

async function applicationIdempotencyKey(kind: "mentorship" | "tutoring", payload: PublicApplicationPayload) {
  const canonical = JSON.stringify({ kind, payload });
  let fingerprint: string;
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    let hash = 2166136261;
    for (let index = 0; index < canonical.length; index += 1) {
      hash = Math.imul(hash ^ canonical.charCodeAt(index), 16777619);
    }
    fingerprint = "fallback-" + (hash >>> 0).toString(16);
  }
  const storageKey = "chekad:application-idempotency:" + fingerprint;
  let key = pendingApplicationKeys.get(storageKey);
  try { key = key || window.sessionStorage.getItem(storageKey) || undefined; } catch { /* storage disabled */ }
  if (!key) {
    key = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "idem-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 16);
    pendingApplicationKeys.set(storageKey, key);
    try { window.sessionStorage.setItem(storageKey, key); } catch { /* in-memory fallback */ }
  }
  return { key, storageKey };
}


export async function fetchPublicPeople(
  kind: PeopleKind,
  field?: OlympiadField,
): Promise<PublicPerson[]> {
  const params = new URLSearchParams();
  if (field) params.set("field", field);

  const query = params.toString();
  const url = API_BASE + "/people/" + kind + (query ? "?" + query : "");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError("ارتباط با سرویس اطلاعات افراد برقرار نشد.", "network");
  }

  if (!response.ok) {
    throw new ApiError("دریافت اطلاعات با خطا روبه‌رو شد.", "http", response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("پاسخ سرویس قابل خواندن نیست.", "invalid-response", response.status);
  }

  if (!Array.isArray(payload)) {
    throw new ApiError("ساختار پاسخ سرویس با قرارداد مورد انتظار سازگار نیست.", "invalid-response");
  }

  return payload.filter((item): item is PublicPerson => {
    return (
      typeof item === "object" &&
      item !== null &&
      typeof (item as PublicPerson).id === "number" &&
      typeof (item as PublicPerson).first_name === "string" &&
      typeof (item as PublicPerson).last_name === "string" &&
      ((item as PublicPerson).field === "physics" || (item as PublicPerson).field === "computer")
    );
  });
}

export async function submitPublicApplication(
  kind: "mentorship" | "tutoring",
  payload: PublicApplicationPayload,
): Promise<PublicApplicationResult> {
  const endpoint =
    kind === "mentorship"
      ? "/application/mentorship-applications"
      : "/application/tutoring-applications";
  const idempotency = await applicationIdempotencyKey(kind, payload);

  let response: Response;
  try {
    response = await fetch(API_BASE + endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Idempotency-Key": idempotency.key,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError("پاسخ سرور دریافت نشد و وضعیت ثبت درخواست نامشخص است. پیش از ارسال دوباره، با چکاد پیگیری کنید.", "network");
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event(STUDENT_SESSION_INVALID_EVENT));
    }
    if (response.status === 422) {
      throw new ApiError("برخی اطلاعات واردشده معتبر نیستند. فرم را بررسی کنید.", "http", 422);
    }
    if (response.status === 403) {
      throw new ApiError("درخواست از مبدأ معتبر ارسال نشده است. صفحه را تازه‌سازی کنید.", "http", 403);
    }
    if (response.status === 429) {
      throw new ApiError("تعداد درخواست‌ها بیش از حد مجاز است. چند دقیقه دیگر دوباره تلاش کنید.", "http", 429);
    }
    if (response.status === 503) {
      throw new ApiError(
        "ثبت درخواست موقتاً غیرفعال است. لطفاً از طریق راه ارتباطی رسمی چکاد پیگیری کنید.",
        "http",
        503,
      );
    }
    throw new ApiError("ثبت درخواست انجام نشد. اطلاعات شما ثبت‌شده تلقی نمی‌شود.", "http", response.status);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new ApiError("پاسخ سرور قابل خواندن نیست؛ وضعیت ثبت درخواست را از چکاد پیگیری کنید.", "invalid-response");
  }

  if (
    typeof result !== "object" ||
    result === null ||
    typeof (result as PublicApplicationResult).request_id !== "number" ||
    (result as PublicApplicationResult).status !== "received" ||
    typeof (result as PublicApplicationResult).message !== "string"
  ) {
    throw new ApiError("ساختار پاسخ سرور معتبر نیست؛ وضعیت ثبت درخواست را پیگیری کنید.", "invalid-response");
  }

  pendingApplicationKeys.delete(idempotency.storageKey);
  try { window.sessionStorage.removeItem(idempotency.storageKey); } catch { /* storage disabled */ }
  return result as PublicApplicationResult;
}

export async function fetchPublicSiteContent(): Promise<Record<string, string>> {
  let response: Response;
  try {
    response = await fetch(API_BASE + "/content/", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("ارتباط با سرویس محتوا برقرار نشد.", "network");
  }

  if (!response.ok) {
    throw new ApiError("دریافت محتوای سایت با خطا روبه‌رو شد.", "http", response.status);
  }

  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ApiError("ساختار محتوای دریافتی معتبر نیست.", "invalid-response");
  }

  return Object.fromEntries(
    Object.entries(payload).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
