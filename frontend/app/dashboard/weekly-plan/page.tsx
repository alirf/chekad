"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchStudentWeeklyPlan,
  updateAssignedWeeklyTaskStatus,
  recordStudentActivity,
  type AssignedWeeklyTask,
} from "../../../lib/student-auth";
import {
  formatPortalDateTime,
  PortalEmptyState,
  PortalPageHeading,
  PortalStatus,
} from "../../../components/student-portal-ui";

function localDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function saturdayStart(value: Date) {
  const start = localDay(value);
  start.setDate(start.getDate() - ((start.getDay() + 1) % 7));
  return start;
}

function weekEnd(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

function dateKey(value: string | Date) {
  const date = new Date(value);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}

function dayTitle(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

function weekTitle(start: Date) {
  const last = new Date(start);
  last.setDate(last.getDate() + 6);
  const firstText = new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
  }).format(start);
  const lastText = new Intl.DateTimeFormat("fa-IR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(last);
  return firstText + " تا " + lastText;
}

export default function StudentWeeklyPlanPage() {
  const [weekStart, setWeekStart] = useState(() => saturdayStart(new Date()));
  const [tasks, setTasks] = useState<AssignedWeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const start = useMemo(() => weekStart.toISOString(), [weekStart]);
  const end = useMemo(() => weekEnd(weekStart).toISOString(), [weekStart]);

  useEffect(() => {
    let active = true;
    fetchStudentWeeklyPlan(start, end)
      .then((result) => {
        if (active) setTasks(result.items);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "دریافت برنامه هفتگی انجام نشد.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [start, end]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        return {
          date,
          items: tasks.filter((task) => dateKey(task.planned_at) === dateKey(date)),
        };
      }),
    [weekStart, tasks],
  );

  const completed = tasks.filter((task) => task.status === "completed").length;
  const totalMinutes = tasks.reduce((sum, task) => sum + task.duration_minutes, 0);
  const currentWeek = dateKey(saturdayStart(new Date())) === dateKey(weekStart);

  function navigateWeek(offset: number) {
    setLoading(true);
    setError("");
    setNotice("");
    setWeekStart((old) => {
      const next = new Date(old);
      next.setDate(next.getDate() + offset);
      return next;
    });
  }

  function navigateToCurrentWeek() {
    setLoading(true);
    setError("");
    setNotice("");
    setWeekStart(saturdayStart(new Date()));
  }

  async function markCompleted(task: AssignedWeeklyTask) {
    if (task.status === "completed" || busyId !== null) return;
    setBusyId(task.id);
    setError("");
    setNotice("");
    try {
      await updateAssignedWeeklyTaskStatus(task.id, "completed");
      void recordStudentActivity("task_completed").catch(() => undefined);
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, status: "completed" } : item,
        ),
      );
      setNotice("انجام فعالیت ثبت شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت انجام فعالیت ناموفق بود.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="student-portal-page">
      <PortalPageHeading
        eyebrow="WEEKLY STUDY PLAN"
        title="برنامه هفتگی"
        description="این برنامه را مشاور یا مدرس برایت تنظیم می‌کند. امکان افزودن، ویرایش، جابه‌جایی یا حذف فعالیت‌ها را نداری؛ فقط می‌توانی انجام هر فعالیت را ثبت کنی."
      />

      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}

      <section className="student-week-progress">
        <div>
          <span>کل فعالیت‌های برنامه</span>
          <strong>{tasks.length.toLocaleString("fa-IR")}</strong>
        </div>
        <div>
          <span>انجام‌شده</span>
          <strong>{completed.toLocaleString("fa-IR")}</strong>
        </div>
        <div>
          <span>زمان برنامه‌ریزی‌شده</span>
          <strong>{Math.floor(totalMinutes / 60).toLocaleString("fa-IR")} ساعت</strong>
        </div>
        <div className="student-week-progress-bar">
          <i style={{ width: tasks.length ? (completed / tasks.length * 100) + "%" : "0%" }} />
        </div>
        <small>
          {tasks.length
            ? Math.round(completed / tasks.length * 100).toLocaleString("fa-IR") + "٪ از فعالیت‌های برنامه انجام شده است."
            : "پس از اینکه مشاور یا مدرس برایت برنامه ثبت کند، فعالیت‌ها در این بخش نمایش داده می‌شوند."}
        </small>
      </section>

      <section className="student-portal-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="student-portal-eyebrow">WEEK VIEW · SATURDAY TO FRIDAY</span>
            <h3 className="mt-1 text-sm font-black text-slate-800">{weekTitle(weekStart)}</h3>
            <p className="mt-1 text-[10px] text-slate-400">
              این برنامه از تقویم ماهانه جلسات و آزمون‌ها جداست.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="student-portal-button secondary" onClick={() => navigateWeek(-7)}>هفته قبل</button>
            <button type="button" className="student-portal-button secondary" disabled={currentWeek} onClick={navigateToCurrentWeek}>این هفته</button>
            <button type="button" className="student-portal-button secondary" onClick={() => navigateWeek(7)}>هفته بعد</button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="student-portal-loading">در حال دریافت برنامه هفته...</div>
      ) : tasks.length ? (
        <div className="student-week-schedule">
          {days.map((day) => (
            <section key={day.date.toISOString()} className="student-portal-card student-week-day">
              <div className="student-calendar-day-heading">
                <strong>{dayTitle(day.date)}</strong>
                <small>{day.items.length.toLocaleString("fa-IR")} فعالیت</small>
              </div>
              {day.items.length ? (
                <div className="student-week-task-list">
                  {day.items.map((task) => (
                    <article key={task.source_type + "-" + task.id} className={"student-week-task " + (task.status === "completed" ? "is-completed" : "")}>
                      <div className="student-week-task-main">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{task.title}</strong>
                          <span className={"student-week-source source-" + task.source_type}>
                            {task.source_type === "mentor" ? "مشاور" : task.source_type === "teacher" ? "مدرس" : "برنامه"}
                          </span>
                        </div>
                        <span>{formatPortalDateTime(task.planned_at)} · {task.duration_minutes.toLocaleString("fa-IR")} دقیقه</span>
                        {task.description && <p>{task.description}</p>}
                      </div>
                      <PortalStatus status={task.status} />
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={task.status === "completed"}
                          disabled={task.status === "completed" || busyId === task.id}
                          onChange={(event) => {
                            if (event.target.checked) void markCompleted(task);
                          }}
                          aria-label={"ثبت انجام فعالیت " + task.title}
                          className="h-5 w-5 accent-blue-600"
                        />
                        {task.status === "completed" ? "انجام شد" : busyId === task.id ? "در حال ثبت..." : "انجام شد"}
                      </label>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="student-portal-muted py-4">برای این روز فعالیتی ثبت نشده است.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <PortalEmptyState
          icon="◷"
          title="هنوز برنامه‌ای برای این هفته ثبت نشده"
          description="تنظیم برنامه هفتگی بر عهده مشاور یا مدرس است. بعد از ثبت برنامه، فعالیت‌ها را در همین صفحه می‌بینی و می‌توانی تیک انجام آن‌ها را بزنی."
        />
      )}
    </div>
  );
}
