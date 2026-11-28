"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchStudentProfile, fetchStudentServices, logoutStudent, StudentAuthError, StudentProfile, StudentService } from "../../lib/student-auth";

const fieldNames = { physics: "المپیاد فیزیک", computer: "المپیاد کامپیوتر" };

export default function StudentDashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [services, setServices] = useState<StudentService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchStudentProfile(), fetchStudentServices()])
      .then(([profile, serviceList]) => {
        if (!active) return;
        setStudent(profile);
        setServices(serviceList);
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
            <p>اینجا می‌توانی سرویس‌های چکاد و مسیرهای تخصصی مرتبط با هدفت را دنبال کنی.</p>
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
        <p className="student-dashboard-disclaimer">این پنل در نسخه فعلی، فهرست خدمات و اطلاعات حساب را نمایش می‌دهد. سابقه ثبت درخواست، پرداخت، رزرو جلسه و نتیجه آزمون پس از پیاده‌سازی سامانه‌های مربوط به آن‌ها اضافه خواهد شد.</p>
      </div>
    </main>
  );
}
