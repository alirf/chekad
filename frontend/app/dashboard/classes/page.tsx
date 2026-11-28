"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchStudentClasses, type StudentClassRecord } from "../../../lib/student-auth";
import { formatPortalDate, formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../../components/student-portal-ui";

const fields = { physics: "المپیاد فیزیک", computer: "المپیاد کامپیوتر" };

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<StudentClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchStudentClasses().then((result) => { if (active) setClasses(result.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت کلاس‌ها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="MY LEARNING" title="کلاس‌ها و منتورینگ من" description="کلاس خصوصی، منتور اختصاصی، مدرس و زمان جلسات فعال را در یک صفحه دنبال کن." />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {loading ? <div className="student-portal-loading">در حال دریافت کلاس‌ها...</div> : classes.length ? (
        <div className="student-class-list">
          {classes.map((item) => (
            <article key={item.assignment_id} className="student-portal-card student-class-card">
              <div className="student-class-heading">
                <div>
                  <span className="student-portal-eyebrow">{item.kind === "mentorship" ? "منتورینگ اختصاصی" : "کلاس خصوصی"} · {fields[item.field]}</span>
                  <h3>{item.title || item.topic}</h3>
                  {item.person_name && <p>همراه آموزشی: <strong>{item.person_name}</strong></p>}
                  <p>شروع همکاری: {formatPortalDate(item.start_date)}{item.end_date ? " · پایان: " + formatPortalDate(item.end_date) : ""}</p>
                </div>
                <PortalStatus status={item.status} />
              </div>
              <div className="student-class-sessions">
                <strong>جلسات</strong>
                {item.sessions.length ? item.sessions.map((session) => (
                  <div key={session.id} className="student-class-session">
                    <span>جلسه {session.session_number}</span>
                    <span>{session.scheduled_at ? formatPortalDateTime(session.scheduled_at) : "زمان هنوز تعیین نشده"}</span>
                    <span>{session.duration_minutes ? session.duration_minutes + " دقیقه" : "مدت نامشخص"}</span>
                    <PortalStatus status={session.status} />
                  </div>
                )) : <p className="student-portal-muted">هنوز جلسه‌ای برای این همکاری زمان‌بندی نشده است.</p>}
              </div>
            </article>
          ))}
        </div>
      ) : <PortalEmptyState icon="▣" title="کلاس یا منتور فعالی برای حسابت ثبت نشده" description="پس از بررسی درخواست و تخصیص منتور یا مدرس، اطلاعات همکاری و جلسات اینجا نمایش داده می‌شود." action={<Link className="student-portal-button primary" href="/mentorship/apply">درخواست منتورینگ</Link>} />}
    </div>
  );
}
