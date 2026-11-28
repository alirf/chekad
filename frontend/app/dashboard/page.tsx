"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchStudentApplications,
  fetchStudentClasses,
  fetchStudentMessageThreads,
  fetchStudentProfile,
  fetchStudentReports,
  fetchStudentSchedule,
  fetchStudentStudyTasks,
  StudentAuthError,
  type StudentApplication,
  type StudentProfile,
  type StudentScheduleEvent,
} from "../../lib/student-auth";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../components/student-portal-ui";

const fieldNames = { physics: "المپیاد فیزیک", computer: "المپیاد کامپیوتر" };
const applicationStatus: Record<string, string> = {
  new: "ثبت‌شده", reviewing: "در حال بررسی", waiting_for_student: "منتظر پاسخ شما",
  options_proposed: "پیشنهادها آماده انتخاب", accepted: "پذیرفته‌شده", active: "در حال اجرا",
  completed: "تکمیل‌شده", rejected: "ردشده", cancelled: "لغوشده",
};

function SummaryCard({ label, value, detail, icon, href }: { label: string; value: string | number; detail: string; icon: string; href: string }) {
  return (
    <Link href={href} className="student-overview-stat">
      <span className="student-overview-stat-icon">{icon}</span>
      <span className="student-overview-stat-copy"><small>{label}</small><strong>{value}</strong><em>{detail}</em></span>
      <span className="student-overview-stat-arrow">←</span>
    </Link>
  );
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [events, setEvents] = useState<StudentScheduleEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [reportCount, setReportCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const profile = await fetchStudentProfile();
        if (!active) return;
        setStudent(profile);
        const results = await Promise.allSettled([
          fetchStudentApplications(),
          fetchStudentSchedule(),
          fetchStudentMessageThreads(),
          fetchStudentClasses(),
          fetchStudentReports(),
          fetchStudentStudyTasks(),
        ]);
        if (!active) return;
        const [requestResult, eventResult, threadResult, classResult, reportResult, taskResult] = results;
        if (requestResult.status === "fulfilled") setApplications(requestResult.value.items);
        if (eventResult.status === "fulfilled") setEvents(eventResult.value.items);
        if (threadResult.status === "fulfilled") setUnread(threadResult.value.items.reduce((sum, item) => sum + (item.unread_count || 0), 0));
        if (classResult.status === "fulfilled") setClassCount(classResult.value.items.length);
        if (reportResult.status === "fulfilled") setReportCount(reportResult.value.total);
        if (taskResult.status === "fulfilled") setTaskCount(taskResult.value.items.filter((item) => item.status === "pending").length);
        const failures = results.filter((item) => item.status === "rejected");
        if (failures.length) setError("بعضی از بخش‌ها موقتاً بارگذاری نشدند. می‌توانی هر بخش را جداگانه باز کنی.");
      } catch (cause) {
        if (!active) return;
        if (cause instanceof StudentAuthError && cause.status === 401) {
          router.replace("/login");
          return;
        }
        setError(cause instanceof Error ? cause.message : "دریافت اطلاعات حساب انجام نشد.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((event) => new Date(event.starts_at).getTime() >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 3);
  }, [events]);

  if (loading) return <div className="student-portal-loading">در حال بارگذاری صفحه شخصی...</div>;
  if (!student) return <div className="student-portal-error" role="alert">{error || "اطلاعات حساب در دسترس نیست."}</div>;

  return (
    <div className="student-dashboard-home">
      <section className="student-welcome-banner">
        <div className="student-welcome-copy">
          <span className="student-welcome-kicker">مسیر رشد تو از همین‌جا ادامه دارد</span>
          <h2>سلام {student.first_name}، خوش آمدی!</h2>
          <p>برای پیشرفت در {fieldNames[student.field]}، برنامه‌ها و همراهی‌های آموزشی‌ات را یک‌جا مدیریت کن.</p>
          <div className="student-welcome-tags">
            <span>{student.grade}</span><span>{fieldNames[student.field]}</span>
            <span className={student.phone_verified ? "is-verified" : "is-unverified"}>{student.phone_verified ? "شماره تأییدشده" : "شماره تأییدنشده"}</span>
          </div>
        </div>
        <div className="student-welcome-art" aria-hidden="true"><span>چ</span><i /><b /></div>
      </section>

      {error && <div className="student-portal-inline-notice" role="status">{error}</div>}

      <section className="student-overview-stats" aria-label="خلاصه وضعیت">
        <SummaryCard label="پیام خوانده‌نشده" value={unread} detail="مشاهده گفت‌وگوها" icon="✉" href="/dashboard/messages" />
        <SummaryCard label="کلاس‌های فعال" value={classCount} detail="جلسات و مدرس‌ها" icon="▣" href="/dashboard/classes" />
        <SummaryCard label="فعالیت‌های برنامه" value={taskCount} detail="در انتظار انجام" icon="◷" href="/dashboard/weekly-plan" />
        <SummaryCard label="گزارش‌های ثبت‌شده" value={reportCount} detail="سوابق عملکرد" icon="▤" href="/dashboard/reports" />
      </section>

      <div className="student-dashboard-grid">
        <section className="student-portal-card student-dashboard-upcoming">
          <PortalPageHeading eyebrow="UP NEXT" title="برنامه پیش رو" description="نزدیک‌ترین جلسه‌ها و فعالیت‌های ثبت‌شده" action={<Link className="student-portal-text-link" href="/dashboard/calendar">تقویم کامل ←</Link>} />
          {upcoming.length ? (
            <div className="student-upcoming-list">
              {upcoming.map((event) => (
                <article className="student-upcoming-item" key={event.id}>
                  <span className={"student-upcoming-icon event-" + event.category}>{event.category === "study" ? "▤" : event.category === "tutoring" ? "▣" : "◎"}</span>
                  <div className="student-upcoming-copy"><strong>{event.title}</strong><small>{formatPortalDateTime(event.starts_at)} · {event.duration_minutes || 0} دقیقه</small></div>
                  <PortalStatus status={event.status} />
                </article>
              ))}
            </div>
          ) : (
            <PortalEmptyState icon="◷" title="برنامه‌ای برای روزهای آینده ثبت نشده" description="جلسات منتورینگ، کلاس‌ها و فعالیت‌های مطالعه پس از ثبت در تقویم اینجا دیده می‌شوند." action={<Link className="student-portal-button secondary" href="/dashboard/weekly-plan">تنظیم برنامه هفتگی</Link>} />
          )}
        </section>

        <section className="student-portal-card student-dashboard-quick">
          <PortalPageHeading eyebrow="QUICK ACCESS" title="دسترسی سریع" description="بخش موردنظرت را انتخاب کن." />
          <div className="student-quick-grid">
            <Link href="/dashboard/messages"><span>✉</span><strong>پیام‌ها</strong><small>ارتباط با چکاد</small></Link>
            <Link href="/dashboard/weekly-plan"><span>◷</span><strong>برنامه هفتگی</strong><small>مدیریت فعالیت‌ها</small></Link>
            <Link href="/dashboard/reports"><span>▤</span><strong>ثبت گزارش</strong><small>ثبت عملکرد روزانه</small></Link>
            <Link href="/dashboard/calendar"><span>▦</span><strong>تقویم</strong><small>مرور زمان‌بندی</small></Link>
            <Link href="/dashboard/classes"><span>▣</span><strong>کلاس‌ها</strong><small>جلسات آموزشی</small></Link>
            <Link href="/dashboard/exams"><span>◇</span><strong>آزمون‌ها</strong><small>فهرست آزمون‌ها</small></Link>
          </div>
        </section>
      </div>

      <section className="student-portal-card student-dashboard-requests">
        <PortalPageHeading
          eyebrow="MY REQUESTS"
          title="درخواست‌های من"
          description="وضعیت درخواست‌های منتورینگ و کلاس خصوصی را پیگیری کن."
          action={<Link className="student-portal-button secondary" href="/mentorship/apply">ثبت درخواست جدید</Link>}
        />
        {applications.length ? (
          <div className="student-request-table-wrap">
            <table className="student-request-table">
              <thead><tr><th>نوع درخواست</th><th>رشته</th><th>کد پیگیری</th><th>وضعیت</th><th>تاریخ ثبت</th></tr></thead>
              <tbody>
                {applications.slice(0, 5).map((item) => (
                  <tr key={item.kind + "-" + item.id}>
                    <td>{item.title}</td><td>{fieldNames[item.field]}</td><td dir="ltr">{item.tracking_code}</td>
                    <td><span className={"student-request-status status-" + item.status}>{applicationStatus[item.status] || item.status}</span></td>
                    <td>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(item.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <PortalEmptyState icon="◇" title="هنوز درخواستی ثبت نکرده‌ای" description="بعد از ثبت درخواست منتورینگ یا کلاس خصوصی، وضعیت و کد پیگیری آن در این بخش نمایش داده می‌شود." action={<div className="student-empty-actions"><Link className="student-portal-button primary" href="/mentorship/apply">درخواست منتورینگ</Link><Link className="student-portal-button secondary" href="/tutoring#request">درخواست کلاس خصوصی</Link></div>} />
        )}
      </section>

      <section className="student-portal-help-banner">
        <div><strong>برای ادامه مسیر به راهنمایی نیاز داری؟</strong><p>از بخش پیام‌ها با پشتیبانی چکاد در ارتباط باش.</p></div>
        <Link href="/dashboard/messages" className="student-portal-button light">شروع گفت‌وگو <span>←</span></Link>
      </section>
    </div>
  );
}
