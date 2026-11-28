"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchStudentSchedule, type StudentScheduleEvent } from "../../../lib/student-auth";
import { fetchStudentExamCalendar } from "../../../lib/student-exams";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../../components/student-portal-ui";

function dayKey(value: string) {
  const date = new Date(value);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}
function monthLabel(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", { month: "long", year: "numeric" }).format(value);
}
function dayLabel(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(value));
}

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<StudentScheduleEvent[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetchStudentSchedule(), fetchStudentExamCalendar()])
      .then(([scheduled, exams]) => {
        if (!active) return;
        const combined = [...scheduled.items, ...exams.items].filter((event) =>
          event.category === "mentorship" || event.category === "tutoring" || event.category === "exam"
        );
        combined.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        setEvents(combined);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "دریافت تقویم انجام نشد.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const monthEvents = useMemo(() => events.filter((event) => {
    const date = new Date(event.starts_at);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  }), [events, month]);

  const groups = useMemo(() => {
    const map = new Map<string, StudentScheduleEvent[]>();
    for (const event of monthEvents) {
      const key = dayKey(event.starts_at);
      map.set(key, [...(map.get(key) || []), event]);
    }
    return Array.from(map.values()).sort((a, b) => new Date(a[0].starts_at).getTime() - new Date(b[0].starts_at).getTime());
  }, [monthEvents]);

  return (
    <div className="student-portal-page">
      <PortalPageHeading
        eyebrow="MONTHLY CALENDAR"
        title="تقویم کلاس‌ها و آزمون‌ها"
        description="این تقویم فقط زمان آزمون‌های ثبت‌نام‌شده، جلسات منتورینگ و کلاس‌های خصوصی را به‌صورت خودکار نشان می‌دهد. فعالیت‌های مطالعه در برنامه هفتگی جدا هستند."
        action={<Link className="student-portal-button secondary" href="/dashboard/weekly-plan">مشاهده برنامه هفتگی</Link>}
      />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      <section className="student-portal-card flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="student-portal-button secondary" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}>ماه قبل</button>
        <strong className="text-sm font-black text-slate-800">{monthLabel(month)}</strong>
        <div className="flex gap-2">
          <button type="button" className="student-portal-button secondary" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>ماه جاری</button>
          <button type="button" className="student-portal-button secondary" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}>ماه بعد</button>
        </div>
      </section>
      {loading ? <div className="student-portal-loading">در حال دریافت تقویم ماه...</div> : groups.length ? (
        <div className="student-calendar-groups">
          {groups.map((group) => (
            <section key={dayKey(group[0].starts_at)} className="student-portal-card student-calendar-day">
              <div className="student-calendar-day-heading"><strong>{dayLabel(group[0].starts_at)}</strong><small>{group.length.toLocaleString("fa-IR")} رویداد</small></div>
              {group.map((event) => (
                <article key={event.id} className="student-calendar-event">
                  <span className={"student-calendar-event-marker event-" + event.category} />
                  <div>
                    <strong>{event.title}</strong>
                    <small>{formatPortalDateTime(event.starts_at)} · {(event.duration_minutes || 0).toLocaleString("fa-IR")} دقیقه</small>
                  </div>
                  <span className="student-portal-eyebrow">{event.category === "exam" ? "آزمون" : event.category === "mentorship" ? "منتورینگ" : "کلاس خصوصی"}</span>
                  <PortalStatus status={event.status} />
                </article>
              ))}
            </section>
          ))}
        </div>
      ) : <PortalEmptyState icon="▦" title="برای این ماه رویدادی ثبت نشده" description="پس از ثبت‌نام آزمون یا زمان‌بندی کلاس و جلسه توسط چکاد، رویدادها به‌صورت خودکار در این تقویم قرار می‌گیرند." />}
    </div>
  );
}
