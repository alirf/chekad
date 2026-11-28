"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchStudentApplications,
  fetchStudentClasses,
  fetchStudentMessageThreads,
  fetchStudentReports,
  fetchStudentSchedule,
  fetchStudentWeeklyPlan,
  type StudentApplication,
  type StudentScheduleEvent,
} from "../../lib/student-auth";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../components/student-portal-ui";
import { useStudentSession } from "../../components/student-session-provider";

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
  const { status: sessionStatus, student } = useStudentSession();
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [events, setEvents] = useState<StudentScheduleEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [classes, setClasses] = useState<import("../../lib/student-auth").StudentClassRecord[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [scheduleReferenceTime, setScheduleReferenceTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;

    let active = true;
    async function load() {
      const results = await Promise.allSettled([
        fetchStudentApplications(),
        fetchStudentSchedule(),
        fetchStudentMessageThreads(),
        fetchStudentClasses(),
        fetchStudentReports(),
        fetchStudentWeeklyPlan(),
      ]);
      if (!active) return;

      const [requestResult, eventResult, threadResult, classResult, reportResult, taskResult] = results;
      if (requestResult.status === "fulfilled") setApplications(requestResult.value.items);
      if (eventResult.status === "fulfilled") {
        setEvents(eventResult.value.items);
        setScheduleReferenceTime(Date.parse(eventResult.value.fetched_at));
      }
      if (threadResult.status === "fulfilled") {
        setUnread(threadResult.value.items.reduce((sum, item) => sum + (item.unread_count || 0), 0));
      }
      if (classResult.status === "fulfilled") {
        setClasses(classResult.value.items);
        setClassCount(classResult.value.items.length);
      }
      if (reportResult.status === "fulfilled") setReportCount(reportResult.value.total);
      if (taskResult.status === "fulfilled") {
        setTaskCount(taskResult.value.items.filter((item) => item.status === "pending").length);
      }
      const failures = results.filter((item) => item.status === "rejected");
      if (failures.length) {
        setError("بعضی از بخش‌ها موقتاً بارگذاری نشدند. می‌توانی هر بخش را جداگانه باز کنی.");
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [sessionStatus]);

  const upcoming = useMemo(() => {
    if (scheduleReferenceTime === null) return [];
    return events
      .filter((event) => new Date(event.starts_at).getTime() >= scheduleReferenceTime)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      .slice(0, 3);
  }, [events, scheduleReferenceTime]);

  const latestApplication = applications[0] || null;
  const activeClass = classes[0] || null;
  let nextStep: { eyebrow: string; title: string; description: string; label: string; href: string };
  if (latestApplication && ["waiting_for_student", "options_proposed"].includes(latestApplication.status)) {
    nextStep = {
      eyebrow: "ACTION REQUIRED",
      title: latestApplication.status === "options_proposed" ? "پیشنهادهای آموزشی آماده بررسی است" : "برای ادامه درخواست، پاسخ تو لازم است",
      description: "گفت‌وگوهای پنل را باز کن و پیام‌های مربوط به درخواستت را بررسی کن.",
      label: "بررسی پیام‌ها", href: "/dashboard/messages",
    };
  } else if (activeClass && taskCount > 0) {
    nextStep = {
      eyebrow: "YOUR NEXT STEP", title: "برنامه هفتگی‌ات را ادامه بده",
      description: taskCount.toLocaleString("fa-IR") + " فعالیت در انتظار انجام داری. پس از انجام هر فعالیت، وضعیت آن را ثبت کن.",
      label: "مشاهده برنامه", href: "/dashboard/weekly-plan",
    };
  } else if (activeClass) {
    nextStep = {
      eyebrow: "YOUR LEARNING", title: "همکاری آموزشی تو فعال است",
      description: activeClass.person_name
        ? "همراه آموزشی تو " + activeClass.person_name + " است. زمان جلسات و گفت‌وگو را از پنل دنبال کن."
        : "زمان جلسات و جزئیات همکاری را در پنل مرور کن.",
      label: "مشاهده کلاس‌ها", href: "/dashboard/classes",
    };
  } else if (latestApplication && ["new", "reviewing", "accepted"].includes(latestApplication.status)) {
    nextStep = {
      eyebrow: "REQUEST IN PROGRESS",
      title: latestApplication.status === "new" ? "درخواستت دریافت شده است" : "درخواستت در حال پیگیری است",
      description: "آخرین وضعیت درخواست و کد پیگیری را بررسی کن. پس از هر تغییر، اعلان آن در پنل ثبت می‌شود.",
      label: "پیگیری درخواست", href: "/dashboard#my-requests",
    };
  } else if (latestApplication && latestApplication.status === "completed") {
    nextStep = {
      eyebrow: "KEEP MOVING", title: "یک مرحله از مسیرت کامل شد",
      description: "بازخورد همکاری را مرور کن یا برای مرحله بعدی مسیر آموزشی درخواست تازه‌ای ثبت کن.",
      label: "مشاهده گزارش‌ها", href: "/dashboard/reports",
    };
  } else if (latestApplication && ["rejected", "cancelled"].includes(latestApplication.status)) {
    nextStep = {
      eyebrow: "NEXT OPPORTUNITY", title: "برای ادامه مسیر راهنمایی بگیر",
      description: "با پشتیبانی چکاد صحبت کن تا گزینه مناسب بعدی را بررسی کنید.",
      label: "گفت‌وگو با پشتیبانی", href: "/dashboard/messages",
    };
  } else {
    nextStep = {
      eyebrow: "GET STARTED", title: "اولین قدم مسیر المپیادت را بردار",
      description: "با ثبت درخواست منتورینگ یا کلاس خصوصی، مسیر آموزشی‌ات را با همراهی مناسب شروع کن.",
      label: "درخواست منتورینگ", href: "/mentorship/apply",
    };
  }

  if (loading || sessionStatus === "checking") return <div className="student-portal-loading">در حال بارگذاری صفحه شخصی...</div>;
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

      <section className="student-next-step-card" aria-label="قدم بعدی شما">
        <div className="student-next-step-copy">
          <span>{nextStep.eyebrow}</span><h3>{nextStep.title}</h3><p>{nextStep.description}</p>
        </div>
        <Link href={nextStep.href}>{nextStep.label} <b>←</b></Link>
      </section>

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

      <section id="my-requests" className="student-portal-card student-dashboard-requests">
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
