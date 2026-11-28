"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchStudentMessageThreads } from "../lib/student-auth";
import { useStudentSession } from "./student-session-provider";

const navigation = [
  { href: "/dashboard", title: "صفحه شخصی", icon: "home" },
  { href: "/dashboard/messages", title: "پیام‌ها", icon: "message" },
  { href: "/dashboard/classes", title: "کلاس‌ها", icon: "class" },
  { href: "/dashboard/exams", title: "آزمون‌ها", icon: "exam" },
  { href: "/dashboard/weekly-plan", title: "برنامه هفتگی", icon: "plan" },
  { href: "/dashboard/reports", title: "ثبت گزارش", icon: "report" },
  { href: "/dashboard/calendar", title: "تقویم برنامه‌ها", icon: "calendar" },
  { href: "/dashboard/invoices", title: "فاکتورها", icon: "invoice" },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "صفحه شخصی", subtitle: "مرور وضعیت و فعالیت‌های مسیر المپیاد" },
  "/dashboard/messages": { title: "پیام‌ها", subtitle: "گفت‌وگو با پشتیبانی، منتور و مدرس خصوصی" },
  "/dashboard/classes": { title: "کلاس‌ها", subtitle: "کلاس‌های خصوصی و جلسات برنامه‌ریزی‌شده" },
  "/dashboard/exams": { title: "آزمون‌ها", subtitle: "دسترسی به آزمون‌های منتشرشده چکاد" },
  "/dashboard/weekly-plan": { title: "برنامه هفتگی", subtitle: "برنامه مطالعه و فعالیت‌های هفته" },
  "/dashboard/reports": { title: "ثبت گزارش", subtitle: "ثبت عملکرد و مرور روند مطالعه" },
  "/dashboard/calendar": { title: "تقویم کلاس‌ها و آزمون‌ها", subtitle: "زمان جلسات و آزمون‌های ثبت‌نام‌شده در ماه" },
  "/dashboard/invoices": { title: "فاکتورها", subtitle: "صورتحساب‌ها و سوابق مالی خدمات" },
};

function PortalIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
    message: "M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.5-4A8.2 8.2 0 0 1 3 12c0-4.7 4-8.5 9-8.5s9 3.3 9 8z",
    class: "M3 5.5h18v12H3z M8 21h8 M12 17.5V21",
    exam: "M7 3h10v3H7z M6 6H4v15h16V6h-2 M8 11h8 M8 15h6",
    plan: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M8 17h6",
    report: "M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5",
    calendar: "M4 4h16v17H4z M8 2v4 M16 2v4 M4 9h16 M8 13h3 M14 13h2",
    invoice: "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h4",
    logout: "M10 17l5-5-5-5 M15 12H3 M21 4v16",
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name] || paths.home} />
    </svg>
  );
}

export function StudentPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, student, logout, refreshSession } = useStudentSession();
  const [unread, setUnread] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const studentName = student
    ? student.first_name + " " + student.last_name
    : "";
  const page = useMemo(() => pageTitles[pathname] || pageTitles["/dashboard"], [pathname]);

  useEffect(() => {
    if (status === "guest") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;

    let active = true;
    fetchStudentMessageThreads()
      .then((result) => {
        if (active) {
          setUnread(result.items.reduce((sum, item) => sum + (item.unread_count || 0), 0));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [status, router, refreshSession]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("خروج از حساب انجام نشد. اتصال را بررسی و دوباره تلاش کن.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (status === "checking") {
    return (
      <div className="student-portal-checking" role="status">
        <span className="student-portal-spinner" />
        <p>در حال بررسی نشست دانش‌آموزی...</p>
      </div>
    );
  }

  if (status === "unavailable") {
    return (
      <div className="student-portal-checking" role="status">
        <p>بررسی حساب در حال حاضر ممکن نیست. اتصال را بررسی و دوباره تلاش کن.</p>
        <button type="button" className="student-portal-topbar-logout" onClick={() => void refreshSession()}>
          بررسی دوباره
        </button>
      </div>
    );
  }

  if (status === "guest" || !student) {
    return (
      <div className="student-portal-checking" role="status">
        <p>در حال انتقال به صفحهٔ ورود...</p>
      </div>
    );
  }

  return (
    <div className="student-portal-shell">
      <aside className="student-portal-sidebar">
        <Link href="/dashboard" className="student-portal-brand">
          <span className="student-portal-brand-mark">چ</span>
          <span><strong>چکاد</strong><small>پنل دانش‌آموزی</small></span>
        </Link>
        <div className="student-portal-sidebar-label">فضای دانش‌آموز</div>
        <nav className="student-portal-nav" aria-label="منوی پنل دانش‌آموزی">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"student-portal-nav-link" + (active ? " is-active" : "")}
                aria-current={active ? "page" : undefined}
              >
                <span className="student-portal-nav-icon"><PortalIcon name={item.icon} /></span>
                <span>{item.title}</span>
                {item.href === "/dashboard/messages" && unread > 0 && <span className="student-portal-unread">{unread > 99 ? "۹۹+" : unread}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="student-portal-sidebar-bottom">
          <div className="student-portal-user">
            <span className="student-portal-avatar">{studentName ? studentName.trim().slice(0, 1) : "د"}</span>
            <span><strong>{studentName || "دانش‌آموز چکاد"}</strong><small>حساب دانش‌آموزی</small></span>
          </div>
          <button type="button" className="student-portal-logout" onClick={handleLogout} disabled={loggingOut}>
            <PortalIcon name="logout" /> {loggingOut ? "در حال خروج..." : "خروج از حساب"}
          </button>
        </div>
      </aside>

      <div className="student-portal-main">
        <header className="student-portal-topbar">
          <div>
            <span className="student-portal-topbar-eyebrow">CHEKAD STUDENT SPACE</span>
            <h1>{page.title}</h1>
            <p>{page.subtitle}</p>
          </div>
          <div className="student-portal-topbar-actions">
            {logoutError && <span role="alert" className="student-portal-inline-notice">{logoutError}</span>}
            <Link href="/dashboard/messages" className="student-portal-notification" aria-label="پیام‌ها">
              <PortalIcon name="message" />
              {unread > 0 && <i />}
            </Link>
            <span className="student-portal-topbar-user"><span>{studentName ? studentName.trim().slice(0, 1) : "د"}</span>{studentName || "دانش‌آموز"}</span>
            <button type="button" className="student-portal-topbar-logout" onClick={handleLogout} disabled={loggingOut}>
              <PortalIcon name="logout" /> {loggingOut ? "..." : "خروج"}
            </button>
          </div>
        </header>
        <main id="main-content" className="student-portal-content">
          {children}
        </main>
        <footer className="student-portal-footer">
          <span>چکاد · همراه مسیر المپیاد فیزیک و کامپیوتر</span>
          <Link href="/contact">ارتباط با پشتیبانی</Link>
        </footer>
      </div>
    </div>
  );
}
