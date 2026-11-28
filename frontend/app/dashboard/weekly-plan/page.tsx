"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createStudentStudyTask,
  deleteStudentStudyTask,
  fetchStudentWeeklyPlan,
  updateAssignedWeeklyTaskStatus,
  updateStudentStudyTask,
  type AssignedWeeklyTask,
} from "../../../lib/student-auth";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../../components/student-portal-ui";

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
function inputDate(value: Date) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function withLocalOffset(value: string) {
  const date = new Date(value);
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return value + sign + String(Math.floor(abs / 60)).padStart(2, "0") + ":" + String(abs % 60).padStart(2, "0");
}
function dateKey(value: string | Date) {
  const date = new Date(value);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}
function dayTitle(value: Date) {
  return new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" }).format(value);
}
function weekTitle(start: Date) {
  const last = new Date(start);
  last.setDate(last.getDate() + 6);
  const firstText = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" }).format(start);
  const lastText = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(last);
  return firstText + " تا " + lastText;
}

export default function StudentWeeklyPlanPage() {
  const [weekStart, setWeekStart] = useState(() => saturdayStart(new Date()));
  const [tasks, setTasks] = useState<AssignedWeeklyTask[]>([]);
  const [editing, setEditing] = useState<AssignedWeeklyTask | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedDate, setPlannedDate] = useState(inputDate(new Date()));
  const [plannedTime, setPlannedTime] = useState("17:00");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const start = useMemo(() => weekStart.toISOString(), [weekStart]);
  const end = useMemo(() => weekEnd(weekStart).toISOString(), [weekStart]);
  const load = useCallback(async () => {
    const result = await fetchStudentWeeklyPlan(start, end);
    setTasks(result.items);
  }, [start, end]);

  useEffect(() => {
    let active = true;
    fetchStudentWeeklyPlan(start, end)
      .then((result) => { if (active) setTasks(result.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت برنامه هفتگی انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [start, end]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { date, items: tasks.filter((task) => dateKey(task.planned_at) === dateKey(date)) };
  }), [weekStart, tasks]);

  const completed = tasks.filter((task) => task.status === "completed").length;
  const personal = tasks.filter((task) => task.source_type === "student");
  const assigned = tasks.length - personal.length;
  const totalMinutes = tasks.reduce((sum, task) => sum + task.duration_minutes, 0);
  const currentWeek = dateKey(saturdayStart(new Date())) === dateKey(weekStart);

  function resetForm() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setPlannedDate(inputDate(new Date()));
    setPlannedTime("17:00");
    setDuration("60");
  }

  function editTask(task: AssignedWeeklyTask) {
    const date = new Date(task.planned_at);
    setEditing(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPlannedDate(inputDate(date));
    setPlannedTime(String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0"));
    setDuration(String(task.duration_minutes));
  }

  async function savePersonalTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        planned_at: withLocalOffset(plannedDate + "T" + plannedTime),
        duration_minutes: Number(duration),
      };
      if (editing) {
        await updateStudentStudyTask(editing.id, payload);
        setNotice("فعالیت شخصی به‌روزرسانی شد.");
      } else {
        await createStudentStudyTask(payload);
        setNotice("فعالیت به برنامه شخصی اضافه شد.");
      }
      resetForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره فعالیت انجام نشد.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task: AssignedWeeklyTask, status: AssignedWeeklyTask["status"]) {
    setBusyId(task.id);
    setError("");
    setNotice("");
    try {
      if (task.source_type === "student") {
        await updateStudentStudyTask(task.id, { status });
      } else {
        await updateAssignedWeeklyTaskStatus(task.id, status);
      }
      setNotice(status === "completed" ? "انجام فعالیت ثبت شد." : status === "skipped" ? "فعالیت به‌عنوان انجام‌نشده ثبت شد." : "وضعیت فعالیت بازگردانی شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تغییر وضعیت فعالیت انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }

  async function removePersonalTask(task: AssignedWeeklyTask) {
    if (task.source_type !== "student" || !window.confirm("این فعالیت شخصی حذف شود؟")) return;
    setBusyId(task.id);
    setError("");
    try {
      await deleteStudentStudyTask(task.id);
      if (editing?.id === task.id) resetForm();
      await load();
      setNotice("فعالیت شخصی حذف شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حذف فعالیت انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="student-portal-page">
      <PortalPageHeading
        eyebrow="WEEKLY STUDY PLAN"
        title="برنامه هفتگی"
        description="نمای ساعت‌به‌ساعت این هفته؛ شامل فعالیت‌های شخصی و برنامه‌ای که منتور یا مدرس برایت تنظیم کرده‌اند."
      />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}

      <section className="student-week-progress">
        <div><span>کل فعالیت‌های هفته</span><strong>{tasks.length.toLocaleString("fa-IR")}</strong></div>
        <div><span>انجام‌شده</span><strong>{completed.toLocaleString("fa-IR")}</strong></div>
        <div><span>برنامه شخصی</span><strong>{personal.length.toLocaleString("fa-IR")}</strong></div>
        <div><span>برنامه منتور/مدرس</span><strong>{assigned.toLocaleString("fa-IR")}</strong></div>
        <div className="student-week-progress-bar"><i style={{ width: tasks.length ? (completed / tasks.length * 100) + "%" : "0%" }} /></div>
        <small>{tasks.length ? Math.round(completed / tasks.length * 100).toLocaleString("fa-IR") + "٪ از فعالیت‌های هفته انجام شده · " + Math.floor(totalMinutes / 60).toLocaleString("fa-IR") + " ساعت برنامه" : "می‌توانی برنامه شخصی بسازی؛ برنامه منتور یا مدرس پس از تخصیص در همین‌جا قرار می‌گیرد."}</small>
      </section>

      <section className="student-portal-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="student-portal-eyebrow">WEEK VIEW · SATURDAY TO FRIDAY</span>
            <h3 className="mt-1 text-sm font-black text-slate-800">{weekTitle(weekStart)}</h3>
            <p className="mt-1 text-[10px] text-slate-400">این بخش با تقویم ماهانه آزمون‌ها و جلسات متفاوت است.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="student-portal-button secondary" onClick={() => setWeekStart((old) => { const next = new Date(old); next.setDate(next.getDate() - 7); return next; })}>هفته قبل</button>
            <button type="button" className="student-portal-button secondary" disabled={currentWeek} onClick={() => setWeekStart(saturdayStart(new Date()))}>این هفته</button>
            <button type="button" className="student-portal-button secondary" onClick={() => setWeekStart((old) => { const next = new Date(old); next.setDate(next.getDate() + 7); return next; })}>هفته بعد</button>
          </div>
        </div>
      </section>

      <section className="student-portal-card">
        <div className="student-portal-card-heading">
          <span className="student-portal-eyebrow">PERSONAL PLANNER</span>
          <h3>{editing ? "ویرایش فعالیت شخصی" : "افزودن فعالیت شخصی"}</h3>
          <p>فعالیت‌های شخصی را خودت مدیریت می‌کنی؛ فعالیت‌های منتور و مدرس فقط از طرف آن‌ها قابل ویرایش است.</p>
        </div>
        <form onSubmit={savePersonalTask} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-slate-600">عنوان فعالیت
            <input required minLength={2} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="مثلاً حل تمرین‌های گراف" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">توضیحات
            <input maxLength={1200} value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm" placeholder="منبع یا جزئیات فعالیت" />
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">تاریخ
            <input type="date" required value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-xs font-bold text-slate-600">ساعت
              <input type="time" required value={plannedTime} onChange={(event) => setPlannedTime(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm" />
            </label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">مدت (دقیقه)
              <input type="number" min="10" max="600" required value={duration} onChange={(event) => setDuration(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button type="submit" disabled={saving || title.trim().length < 2} className="student-portal-button primary">{saving ? "در حال ذخیره..." : editing ? "ذخیره تغییرات" : "افزودن فعالیت به برنامه"}</button>
            {editing && <button type="button" onClick={resetForm} className="student-portal-button secondary">انصراف</button>}
          </div>
        </form>
      </section>

      {loading ? <div className="student-portal-loading">در حال دریافت برنامه هفته...</div> : tasks.length ? (
        <div className="student-week-schedule">
          {days.map((day) => (
            <section key={day.date.toISOString()} className="student-portal-card student-week-day">
              <div className="student-calendar-day-heading"><strong>{dayTitle(day.date)}</strong><small>{day.items.length.toLocaleString("fa-IR")} فعالیت</small></div>
              {day.items.length ? (
                <div className="student-week-task-list">
                  {day.items.map((task) => (
                    <article key={task.source_type + "-" + task.id} className={"student-week-task " + (task.status === "completed" ? "is-completed" : "")}>
                      <div className="student-week-task-main">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong>{task.title}</strong>
                          <span className={"student-week-source source-" + task.source_type}>{task.source_type === "student" ? "شخصی" : task.source_type === "mentor" ? "منتور" : "مدرس"}</span>
                        </div>
                        <span>{formatPortalDateTime(task.planned_at)} · {task.duration_minutes.toLocaleString("fa-IR")} دقیقه</span>
                        {task.description && <p>{task.description}</p>}
                      </div>
                      <PortalStatus status={task.status} />
                      <div className="student-week-task-actions">
                        {task.status !== "completed" && <button type="button" disabled={busyId === task.id} onClick={() => changeStatus(task, "completed")}>ثبت انجام</button>}
                        {task.status !== "pending" && <button type="button" disabled={busyId === task.id} onClick={() => changeStatus(task, "pending")}>بازگردانی</button>}
                        {task.status === "pending" && <button type="button" disabled={busyId === task.id} onClick={() => changeStatus(task, "skipped")}>انجام نشد</button>}
                        {task.source_type === "student" && <>
                          <button type="button" disabled={busyId === task.id} onClick={() => editTask(task)}>ویرایش</button>
                          <button type="button" disabled={busyId === task.id} onClick={() => removePersonalTask(task)}>حذف</button>
                        </>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="student-portal-muted py-4">برای این روز فعالیتی ثبت نشده است.</p>}
            </section>
          ))}
        </div>
      ) : <PortalEmptyState icon="◷" title="برنامه‌ای برای این هفته ثبت نشده" description="می‌توانی فعالیت شخصی ثبت کنی؛ برنامه منتور یا مدرس نیز بعد از تخصیص در همین‌جا نمایش داده می‌شود." />}
    </div>
  );
}
