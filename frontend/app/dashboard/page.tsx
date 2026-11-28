"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchStudentApplications,
  fetchStudentProfile,
  fetchStudentServices,
  logoutStudent,
  StudentAuthError,
  type StudentApplication,
  type StudentProfile,
  type StudentService,
} from "../../lib/student-auth";

const fieldNames = { physics: "المپیاد فیزیک", computer: "المپیاد کامپیوتر" };
const statusLabels: Record<string, string> = {
  new: "ثبت‌شده",
  reviewing: "در حال بررسی",
  waiting_for_student: "منتظر پاسخ دانش‌آموز",
  options_proposed: "پیشنهادها آماده انتخاب",
  accepted: "پذیرفته‌شده",
  active: "در حال اجرا",
  completed: "تکمیل‌شده",
  rejected: "ردشده",
  cancelled: "لغوشده",
};

function formatRequestDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [services, setServices] = useState<StudentService[]>([]);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchStudentProfile(), fetchStudentServices(), fetchStudentApplications()])
      .then(([profile, serviceList, applicationList]) => {
        if (!active) return;
        setStudent(profile);
        setServices(serviceList);
        setApplications(applicationList.items);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof StudentAuthError && cause.status === 401) {
          router.replace("/login");
          return;
        }
        setError(cause instanceof Error ? cause.message : "دریافت اطلاعات حساب انجام نشد.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  async function handleLogout() {
    try {
      await logoutStudent();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (loading) {
    return <main id="main-content" className="student-dashboard-page"><div className="student-dashboard-loading">در حال دریافت اطلاعات حساب...</div></main>;
  }

  if (!student) {
    return <main id="main-content" className="student-dashboard-page"><div className="student-dashboard-loading" role="alert">{error || "حساب دانش‌آموزی پیدا نشد."}</div></main>;
  }

  return (
    <main id="main-content" className="student-dashboard-page">
      <div className="student-dashboard-container">
        <section className="student-dashboard-welcome">
          <div>
            <span className="student-dashboard-kicker">پنل دانش‌آموزی چکاد</span>
            <h1>سلام {student.first_name}، به مسیرت خوش آمدی.</h1>
            <p>اینجا می‌توانی سرویس‌ها و درخواست‌های ثبت‌شده‌ات را دنبال کنی.</p>
          </div>
          <button type="button" className="student-dashboard-logout" onClick={handleLogout}>خروج از حساب</button>
          <div className="student-dashboard-orbit" aria-hidden="true" />
        </section>

        <section className="student-profile-strip" aria-label="اطلاعات حساب">
          <div><span>نام دانش‌آموز</span><strong>{student.first_name} {student.last_name}</strong></div>
          <div><span>پایه تحصیلی</span><strong>{student.grade}</strong></div>
          <div><span>مسیر المپیاد</span><strong>{fieldNames[student.field]}</strong></div>
          <div>
            <span>شماره همراه</span>
            <strong dir="ltr">{student.phone}</strong>
            <small className={student.phone_verified ? "student-phone-status is-verified" : "student-phone-status"}>
              {student.phone_verified ? "شماره تأیید شده" : "شماره هنوز تأیید نشده"}
            </small>
          </div>
        </section>

        {error && <p className="student-dashboard-error" role="alert">{error}</p>}

        <section className="student-applications-section">
          <div className="student-services-heading">
            <div>
              <span className="student-dashboard-kicker">REQUEST TRACKING</span>
              <h2>درخواست‌های من</h2>
              <p>آخرین وضعیت درخواست‌های منتورینگ و کلاس خصوصی را اینجا ببین.</p>
            </div>
            <div className="student-application-actions">
              <Link href="/mentorship/apply">درخواست منتورینگ</Link>
              <Link href="/tutoring#request">درخواست کلاس خصوصی</Link>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="student-applications-empty">
              <strong>هنوز درخواستی ثبت نکرده‌ای.</strong>
              <p>بعد از ثبت درخواست منتورینگ یا کلاس خصوصی، کد پیگیری و وضعیت آن در همین بخش نمایش داده می‌شود.</p>
            </div>
          ) : (
            <div className="student-applications-list">
              {applications.map((application) => (
                <article className="student-application-card" key={application.kind + "-" + application.id}>
                  <div className="student-application-card-top">
                    <div>
                      <span className="student-application-kind">{application.title}</span>
                      <h3>{fieldNames[application.field]}</h3>
                    </div>
                    <span className={"student-application-status status-" + application.status}>
                      {statusLabels[application.status] || application.status}
                    </span>
                  </div>
                  <div className="student-application-meta">
                    <span>کد پیگیری: <b dir="ltr">{application.tracking_code}</b></span>
                    <span>ثبت: {formatRequestDate(application.created_at)}</span>
                    <span>آخرین تغییر: {formatRequestDate(application.updated_at)}</span>
                  </div>
                  {application.details && <p className="student-application-details">{application.details}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="student-services-section">
          <div className="student-services-heading">
            <div>
              <span className="student-dashboard-kicker">YOUR SERVICES</span>
              <h2>سرویس‌های چکاد</h2>
              <p>خدمات مرتبط با مسیر المپیاد را از اینجا پیدا کن.</p>
            </div>
          </div>
          <div className="student-services-grid">
            {services.map((service, index) => (
              <article className="student-service-card" key={service.key}>
                <span className={"student-service-icon student-service-icon-" + (index + 1)} aria-hidden="true">
                  {index === 0 ? "◎" : index === 1 ? "✎" : index === 2 ? "◇" : "▤"}
                </span>
                <div className="student-service-meta">{service.availability === "catalog" ? "فهرست خدمات" : "خدمت چکاد"}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                {service.note && <small>{service.note}</small>}
                <Link href={service.href} className="student-service-link">{service.action_label}<span aria-hidden="true">←</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="student-dashboard-help">
          <div><strong>برای ادامه مسیر راهنمایی لازم داری؟</strong><p>از صفحه ارتباط با چکاد پیام بفرست تا راهنمایی شوی.</p></div>
          <Link href="/contact">ارتباط با چکاد <span aria-hidden="true">←</span></Link>
        </section>
        <p className="student-dashboard-disclaimer">این پنل، درخواست‌های ثبت‌شده را به حساب شخصی متصل می‌کند. یادداشت‌های داخلی تیم چکاد در پنل دانش‌آموز نمایش داده نمی‌شوند.</p>
      </div>
    </main>
  );
}
