import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "./logout-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Admin = {
  id: number;
  email: string;
  name: string;
};

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("chekad_access_token")?.value;
  if (!token) redirect("/admin/login");

  const authServiceUrl = process.env.AUTH_INTERNAL_URL || "http://auth-service:8000";
  let response: Response;
  try {
    response = await fetch(`${authServiceUrl}/me`, {
      method: "GET",
      headers: { Cookie: `chekad_access_token=${token}` },
      cache: "no-store",
    });
  } catch {
    // Fail closed: never render protected pages if the auth service is unavailable.
    redirect("/admin/login?reason=auth-unavailable");
  }

  if (!response.ok) redirect("/admin/login");
  const admin = (await response.json()) as Admin;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-bold text-slate-900">چکاد</p>
            <p className="mt-1 text-xs text-slate-500">پنل مدیریت · {admin.name}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3"><Link href="/admin" className="text-sm font-bold text-slate-700 hover:text-blue-700">درخواست‌ها</Link><Link href="/admin/assignments" className="text-sm font-bold text-slate-700 hover:text-blue-700">تخصیص‌ها</Link><Link href="/admin/messages" className="text-sm font-bold text-slate-700 hover:text-blue-700">پیام‌ها</Link><Link href="/admin/reports" className="text-sm font-bold text-slate-700 hover:text-blue-700">گزارش‌ها</Link><Link href="/admin/mentor-accounts" className="text-sm font-bold text-slate-700 hover:text-blue-700">حساب مشاوران</Link><Link href="/admin/teacher-accounts" className="text-sm font-bold text-slate-700 hover:text-blue-700">حساب مدرسان</Link><Link href="/admin/exams" className="text-sm font-bold text-slate-700 hover:text-blue-700">مدیریت آزمون</Link><Link href="/admin/exam-registrations" className="text-sm font-bold text-slate-700 hover:text-blue-700">ثبت‌نام آزمون‌ها</Link><Link href="/admin/invoices" className="text-sm font-bold text-slate-700 hover:text-blue-700">فاکتورها</Link><Link href="/admin/content" className="text-sm font-bold text-slate-700 hover:text-blue-700">محتوا</Link><LogoutButton /></nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
