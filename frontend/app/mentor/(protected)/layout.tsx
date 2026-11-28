import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MentorLogoutButton } from "./logout-button";

export const dynamic = "force-dynamic";

type Mentor = { id: number; mentor_profile_id: number; phone: string; display_name: string };

export default async function MentorProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("chekad_mentor_token")?.value;
  if (!token) redirect("/mentor/login");

  const authServiceUrl = process.env.AUTH_INTERNAL_URL || "http://auth-service:8000";
  let response: Response;
  try {
    response = await fetch(authServiceUrl.replace(/\/$/, "") + "/mentor/me", {
      headers: { Cookie: "chekad_mentor_token=" + token },
      cache: "no-store",
    });
  } catch {
    redirect("/mentor/login?reason=auth-unavailable");
  }
  if (!response.ok) redirect("/mentor/login");
  const mentor = await response.json() as Mentor;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link href="/mentor/messages" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-xl font-black text-white">چ</span>
            <span><strong className="block text-sm font-black text-slate-900">چکاد</strong><small className="text-[10px] text-slate-500">پنل مشاور و منتور</small></span>
          </Link>
          <nav className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <Link href="/mentor/messages" className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-blue-700">پیام‌ها</Link>
            <Link href="/mentor/reports" className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-blue-700">گزارش‌ها و پیشرفت</Link>
            <span className="hidden text-slate-400 sm:inline">{mentor.display_name}</span>
            <MentorLogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
