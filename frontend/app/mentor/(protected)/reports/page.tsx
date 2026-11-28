"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MentorAuthError } from "../../../../lib/mentor-auth";
import {
  createMentorWeeklyReport,
  fetchAssignedStudentStudyReports,
  fetchMentorAssignments,
  fetchMentorWeeklyReports,
  MentorPortalError,
  type MentorAssignment,
  type MentorWeeklyReport,
  type StudentStudyReport,
} from "../../../../lib/mentor-portal";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

export default function MentorReportsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<MentorAssignment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [studyReports, setStudyReports] = useState<StudentStudyReport[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<MentorWeeklyReport[]>([]);
  const [week, setWeek] = useState("1");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(() => assignments.find((item) => item.id === selectedId) || null, [assignments, selectedId]);

  const loadSelected = useCallback(async (id: number) => {
    const [study, weekly] = await Promise.all([
      fetchAssignedStudentStudyReports(id),
      fetchMentorWeeklyReports(id),
    ]);
    setStudyReports(study.items);
    setWeeklyReports(weekly.items);
  }, []);

  useEffect(() => {
    let active = true;
    fetchMentorAssignments()
      .then((result) => {
        if (!active) return;
        setAssignments(result.items);
        setSelectedId(result.items[0]?.id ?? null);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof MentorAuthError && cause.status === 401) router.replace("/mentor/login");
        else setError(cause instanceof Error ? cause.message : "دریافت دانش‌آموزان انجام نشد.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    loadSelected(selectedId)
      .catch((cause) => {
        if (!active) return;
        if ((cause instanceof MentorPortalError || cause instanceof MentorAuthError) && cause.status === 401) router.replace("/mentor/login");
        else setError(cause instanceof Error ? cause.message : "دریافت گزارش‌ها انجام نشد.");
      });
    return () => { active = false; };
  }, [selectedId, loadSelected, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !content.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await createMentorWeeklyReport(selected.id, Number(week), content.trim());
      setContent("");
      setNotice("گزارش هفتگی برای دانش‌آموز ثبت شد.");
      await loadSelected(selected.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت گزارش هفتگی انجام نشد.");
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold tracking-widest text-blue-600">STUDENT PROGRESS</p><h1 className="mt-1 text-2xl font-black text-slate-900">گزارش‌های مطالعه و بازخورد هفتگی</h1><p className="mt-1 text-sm text-slate-500">گزارش‌های دانش‌آموزان تخصیص‌یافته را مرور و برای هر هفته بازخورد ثبت کن.</p></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="grid max-w-xl gap-2 text-xs font-bold text-slate-700">دانش‌آموز / تخصیص فعال
          <select value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm">
            <option value="">انتخاب دانش‌آموز</option>
            {assignments.map((item) => <option key={item.id} value={item.id}>{item.student_name} · {item.field === "physics" ? "فیزیک" : "کامپیوتر"} · تخصیص #{item.id}</option>)}
          </select>
        </label>
        {selected && <p className="mt-2 text-[10px] text-slate-400">{selected.grade || "پایه نامشخص"} · شروع همکاری {dateLabel(selected.start_date)}{selected.end_date ? " · پایان " + dateLabel(selected.end_date) : ""}</p>}
      </section>

      {selected ? <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="font-black text-slate-900">گزارش‌های روزانه دانش‌آموز</h2><p className="mt-1 text-xs text-slate-500">محتوای زیر فقط برای دانش‌آموز تخصیص‌یافته نمایش داده می‌شود.</p></div>
          {studyReports.length ? <div className="grid max-h-[700px] gap-3 overflow-y-auto">
            {studyReports.map((report) => <article key={report.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-slate-800">{dateLabel(report.report_date)}</strong><span className="text-[10px] font-bold text-blue-600">{Math.floor(report.study_minutes / 60)} ساعت و {report.study_minutes % 60} دقیقه</span></div>
              <small className="mt-2 block text-[10px] text-amber-700">{report.topics}</small>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-slate-600">{report.summary}</p>
              {report.blockers && <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] leading-6 text-slate-500"><b>موانع:</b> {report.blockers}</p>}
              {report.next_step && <p className="mt-2 text-[10px] leading-6 text-slate-500"><b>گام بعدی:</b> {report.next_step}</p>}
            </article>)}
          </div> : <p className="rounded-xl bg-slate-50 p-7 text-center text-xs text-slate-400">هنوز گزارشی از این دانش‌آموز ثبت نشده است.</p>}
        </section>

        <div className="grid content-start gap-5">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4"><h2 className="font-black text-slate-900">ثبت بازخورد هفتگی</h2><p className="mt-1 text-xs text-slate-500">این گزارش پس از ثبت در پنل دانش‌آموز هم قابل مشاهده است.</p></div>
            <label className="mb-3 grid gap-1 text-xs font-bold text-slate-700">شماره هفته
              <input type="number" min="1" max="52" value={week} onChange={(event) => setWeek(event.target.value)} required className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm" />
            </label>
            <label className="mb-4 grid gap-1 text-xs font-bold text-slate-700">بازخورد و ارزیابی
              <textarea value={content} onChange={(event) => setContent(event.target.value)} required minLength={10} maxLength={5000} rows={6} placeholder="پیشرفت، نقاط قوت، موانع و اولویت هفته آینده..." className="rounded-lg border border-slate-200 p-3 text-sm leading-7 outline-none focus:border-blue-400" />
            </label>
            <button type="submit" disabled={saving || content.trim().length < 10 || Number(week) < 1 || Number(week) > 52} className="rounded-lg bg-blue-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? "در حال ثبت..." : "ثبت گزارش هفتگی"}</button>
          </form>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-black text-slate-900">بازخوردهای ثبت‌شده</h2>
            {weeklyReports.length ? <div className="grid gap-3">
              {weeklyReports.map((report) => <article key={report.id} className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-2"><strong className="text-xs text-slate-800">هفته {report.week_number.toLocaleString("fa-IR")}</strong><small className="text-[9px] text-slate-400">{dateLabel(report.created_at)}</small></div><p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-slate-600">{report.content}</p></article>)}
            </div> : <p className="text-xs text-slate-400">هنوز بازخوردی ثبت نشده است.</p>}
          </section>
        </div>
      </div> : <p className="rounded-xl bg-white p-8 text-center text-xs text-slate-400">{loading ? "در حال بارگذاری تخصیص‌ها..." : "تخصیص فعالی برای این حساب پیدا نشد."}</p>}
    </div>
  );
}
