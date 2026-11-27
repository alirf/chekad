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

export async function fetchPublicSiteContent(): Promise<Record<string, string>> {
  let response: Response;
  try {
    // The gateway forwards /api/content/ to the content-service root.
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
