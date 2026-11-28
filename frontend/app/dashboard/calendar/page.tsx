"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchStudentSchedule, type StudentScheduleEvent } from "../../../lib/student-auth";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../../components/student-portal-ui";

function dayKey(value: string) {
  const date = new Date(value);
  return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
}
function dayLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<StudentScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchStudentSchedule().then((result) => { if (active) setEvents(result.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت تقویم انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const groups = useMemo(() => {
    const map = new Map<string, StudentScheduleEvent[]>();
    for (const event of events) {
      const key = dayKey(event.starts_at);
      map.set(key, [...(map.get(key) || []), event]);
    }
    return Array.from(map.values()).sort((a, b) => new Date(a[0].starts_at).getTime() - new Date(b[0].starts_at).getTime());
  }, [events]);

  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="MY CALENDAR" title="تقویم برنامه‌ها" description="جلسات منتورینگ، کلاس خصوصی و برنامه مطالعه شخصی را در یک نما ببین." action={<Link className="student-portal-button secondary" href="/dashboard/weekly-plan">مدیریت برنامه هفتگی</Link>} />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {loading ? <div className="student-portal-loading">در حال دریافت تقویم...</div> : groups.length ? (
        <div className="student-calendar-groups">
          {groups.map((group) => (
            <section className="student-portal-card student-calendar-day" key={dayKey(group[0].starts_at)}>
              <div className="student-calendar-day-heading"><strong>{dayLabel(group[0].starts_at)}</strong><small>{group.length} برنامه</small></div>
              {group.map((event) => (
                <article key={event.id} className="student-calendar-event">
                  <span className={"student-calendar-event-marker event-" + event.category} />
                  <div><strong>{event.title}</strong><small>{formatPortalDateTime(event.starts_at)} · {event.duration_minutes || 0} دقیقه</small></div>
                  <PortalStatus status={event.status} />
                </article>
              ))}
            </section>
          ))}
        </div>
      ) : <PortalEmptyState icon="▦" title="تقویم هنوز خالی است" description="به محض زمان‌بندی جلسه‌ها یا افزودن فعالیت مطالعه، رویدادها در این تقویم قرار می‌گیرند." action={<Link className="student-portal-button primary" href="/dashboard/weekly-plan">افزودن برنامه</Link>} />}
    </div>
  );
}
