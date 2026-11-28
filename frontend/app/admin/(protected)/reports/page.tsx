"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Report = {
  id: number;
  student_auth_id: number;
  report_date: string;
  study_minutes: number;
  topics: string;
  summary: string;
  blockers?: string | null;
  next_step?: string | null;
  created_at: string;
};

function reportDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(date);
}

export default function AdminStudentReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async (filter: string) => {
    setError("");
    const params = new URLSearchParams();
    if (filter.trim()) params.set("student_auth_id", filter.trim());
    const response = await fetch("/api/application/admin/student-reports" + (params.size ? "?" + params.toString() : ""), {
      credentials: "same-origin", cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "دریافت گزارش‌ها انجام نشد.");
    setReports(data.items);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/application/admin/student-reports", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "دریافت گزارش‌ها انجام نشد.");
        return data;
      })
      .then((data) => { if (active) setReports(data.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "خطای ارتباط"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try { await load(studentId); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "جست‌وجو انجام نشد."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-widest text-blue-600">STUDENT PROGRESS</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">گزارش‌های دانش‌آموزان</h1>
        <p className="mt-1 text-sm text-slate-500">گزارش‌های ثبت‌شده را برای پیگیری روند مطالعه مرور کن.</p>
      </div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="grid gap-1 text-xs font-bold text-slate-600">شناسه حساب دانش‌آموزی (اختیاری)
          <input value={studentId} onChange={(event) => setStudentId(event.target.value)} type="number" min="1" className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" placeholder="مثلاً ۴۱" />
        </label>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white">جست‌وجو</button>
        <span className="text-xs text-slate-400">تعداد گزارش‌ها: {reports.length}</span>
      </form>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-8 text-center text-sm text-slate-400">در حال دریافت گزارش‌ها...</p> : reports.length ? (
          <div className="divide-y divide-slate-100">
            {reports.map((report) => (
              <article key={report.id} className="p-4 sm:p-5">
                <button type="button" className="flex w-full flex-wrap items-center justify-between gap-3 text-right" onClick={() => setExpanded(expanded === report.id ? null : report.id)}>
                  <span><strong className="block text-sm text-slate-800">دانش‌آموز #{report.student_auth_id} · {report.topics}</strong><small className="mt-1 block text-xs text-slate-400">{reportDate(report.report_date)} · {Math.floor(report.study_minutes / 60)} ساعت و {report.study_minutes % 60} دقیقه مطالعه</small></span>
                  <span className="text-xs font-bold text-blue-600">{expanded === report.id ? "بستن جزئیات −" : "مشاهده جزئیات +"}</span>
                </button>
                {expanded === report.id && <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-7 text-slate-600">
                  <div><strong className="text-slate-800">شرح فعالیت:</strong><p className="whitespace-pre-wrap">{report.summary}</p></div>
                  {report.blockers && <div><strong className="text-slate-800">موانع:</strong><p className="whitespace-pre-wrap">{report.blockers}</p></div>}
                  {report.next_step && <div><strong className="text-slate-800">اقدام بعدی:</strong><p className="whitespace-pre-wrap">{report.next_step}</p></div>}
                </div>}
              </article>
            ))}
          </div>
        ) : <p className="p-9 text-center text-sm text-slate-400">گزارشی با این مشخصات ثبت نشده است.</p>}
      </section>
    </div>
  );
}
