"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  createStudentStudyTask, deleteStudentStudyTask, fetchStudentStudyTasks, updateStudentStudyTask,
  type StudentStudyTask,
} from "../../../lib/student-auth";
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../../components/student-portal-ui";

function todayValue() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function weekBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 1) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function StudentWeeklyPlanPage() {
  const [tasks, setTasks] = useState<StudentStudyTask[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayValue());
  const [time, setTime] = useState("17:00");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const bounds = weekBounds();
    const result = await fetchStudentStudyTasks(bounds.start, bounds.end);
    setTasks(result.items);
  }, []);

  useEffect(() => {
    let active = true;
    const bounds = weekBounds();
    fetchStudentStudyTasks(bounds.start, bounds.end).then((result) => { if (active) setTasks(result.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت برنامه انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const plannedAt = new Date(date + "T" + time);
      if (Number.isNaN(plannedAt.getTime())) throw new Error("زمان فعالیت معتبر نیست.");
      await createStudentStudyTask({ title, description, planned_at: plannedAt.toISOString(), duration_minutes: Number(duration) });
      setTitle(""); setDescription(""); setNotice("فعالیت به برنامه هفتگی اضافه شد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت فعالیت انجام نشد."); }
    finally { setSaving(false); }
  }

  async function changeStatus(task: StudentStudyTask, status: StudentStudyTask["status"]) {
    setError(""); setNotice("");
    try { await updateStudentStudyTask(task.id, { status }); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر وضعیت انجام نشد."); }
  }
  async function removeTask(task: StudentStudyTask) {
    if (!window.confirm("این فعالیت از برنامه حذف شود؟")) return;
    try { await deleteStudentStudyTask(task.id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "حذف فعالیت انجام نشد."); }
  }

  const completed = tasks.filter((task) => task.status === "completed").length;
  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="WEEKLY STUDY PLAN" title="برنامه هفتگی" description="فعالیت‌های شخصی مطالعه را زمان‌بندی کن و روند انجام آن‌ها را دنبال کن." />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}
      <section className="student-week-progress">
        <div><span>فعالیت‌های این هفته</span><strong>{tasks.length}</strong></div>
        <div><span>انجام‌شده</span><strong>{completed}</strong></div>
        <div className="student-week-progress-bar"><i style={{ width: tasks.length ? (completed / tasks.length * 100) + "%" : "0%" }} /></div>
        <small>{tasks.length ? Math.round(completed / tasks.length * 100) + "٪ از فعالیت‌های برنامه انجام شده" : "با افزودن فعالیت، روند پیشرفت اینجا نمایش داده می‌شود."}</small>
      </section>
      <div className="student-report-layout plan-layout">
        <form className="student-portal-card student-report-form" onSubmit={submit}>
          <div className="student-portal-card-heading"><span className="student-portal-eyebrow">ADD TO PLAN</span><h3>افزودن فعالیت</h3><p>برنامه شخصی خودت را ثبت کن. این نسخه هنوز برنامه منتور را جایگزین نمی‌کند.</p></div>
          <div className="student-portal-form-grid">
            <label className="wide"><span>عنوان فعالیت</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="مثلاً حل تمرین‌های گراف" required /></label>
            <label><span>تاریخ</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
            <label><span>ساعت شروع</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
            <label><span>مدت (دقیقه)</span><input type="number" min="10" max="600" step="5" value={duration} onChange={(event) => setDuration(event.target.value)} required /></label>
            <label className="wide"><span>توضیحات</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1200} placeholder="جزئیات یا هدف فعالیت (اختیاری)" /></label>
          </div>
          <button type="submit" className="student-portal-button primary full" disabled={saving || title.trim().length < 2}>{saving ? "در حال ثبت..." : "افزودن به برنامه"}</button>
        </form>
        <section className="student-portal-card student-week-task-panel">
          <div className="student-portal-card-heading"><span className="student-portal-eyebrow">THIS WEEK</span><h3>فعالیت‌های برنامه</h3><p>هفته از شنبه تا جمعه نمایش داده می‌شود.</p></div>
          {loading ? <div className="student-portal-loading compact">در حال دریافت برنامه...</div> : tasks.length ? (
            <div className="student-week-task-list">
              {tasks.map((task) => (
                <article className={"student-week-task " + (task.status === "completed" ? "is-completed" : "")} key={task.id}>
                  <div className="student-week-task-main"><strong>{task.title}</strong><span>{formatPortalDateTime(task.planned_at)} · {task.duration_minutes} دقیقه</span>{task.description && <p>{task.description}</p>}</div>
                  <PortalStatus status={task.status} />
                  <div className="student-week-task-actions">
                    {task.status !== "completed" && <button type="button" onClick={() => changeStatus(task, "completed")}>ثبت انجام</button>}
                    {task.status !== "pending" && <button type="button" onClick={() => changeStatus(task, "pending")}>بازگردانی</button>}
                    <button type="button" className="danger" onClick={() => removeTask(task)}>حذف</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <PortalEmptyState icon="◷" title="برای این هفته برنامه‌ای نداری" description="از فرم کنار صفحه اولین فعالیت مطالعه را به برنامه اضافه کن." />}
        </section>
      </div>
    </div>
  );
}
