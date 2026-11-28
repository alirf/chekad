"use client";

import { useEffect, useState } from "react";

type Registration = {
  id: number;
  exam_id: number;
  exam_title: string;
  field: "physics" | "computer";
  student_auth_id: number;
  status: "registered" | "cancelled";
  registered_at: string;
  cancelled_at?: string | null;
};
function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function ExamRegistrationsPage() {
  const [items, setItems] = useState<Registration[]>([]);
  const [filter, setFilter] = useState<"all" | "registered" | "cancelled">("registered");
  const [examId, setExamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (examId.trim()) params.set("exam_id", examId.trim());
    fetch("/api/content/admin/exam-registrations" + (params.size ? "?" + params.toString() : ""), {
      credentials: "same-origin", cache: "no-store",
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "دریافت ثبت‌نام‌ها انجام نشد.");
      return data;
    }).then((data) => { if (active) setItems(data.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "خطای ارتباط"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, examId]);

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold tracking-widest text-blue-600">EXAM REGISTRATION</p><h1 className="mt-1 text-2xl font-black text-slate-900">ثبت‌نام دانش‌آموزان در آزمون‌ها</h1><p className="mt-1 text-sm text-slate-500">فهرست ثبت‌نام‌های فعال و لغوشده را بر اساس آزمون بررسی کن.</p></div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="grid gap-1 text-xs font-bold text-slate-600">شناسه آزمون (اختیاری)<input type="number" min="1" value={examId} onChange={(event) => setExamId(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <div className="flex gap-2">
          {(["registered", "cancelled", "all"] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={"rounded-lg border px-3 py-2.5 text-xs font-bold " + (filter === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600")}>{value === "registered" ? "فعال" : value === "cancelled" ? "لغوشده" : "همه"}</button>)}
        </div>
        <span className="mr-auto text-xs text-slate-400">{items.length} مورد</span>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-8 text-center text-xs text-slate-400">در حال بارگذاری...</p> : items.length ? <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-right text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-3">دانش‌آموز</th><th className="px-4 py-3">آزمون</th><th className="px-4 py-3">رشته</th><th className="px-4 py-3">تاریخ ثبت‌نام</th><th className="px-4 py-3">وضعیت</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.id}>
              <td className="px-4 py-3 font-bold text-slate-700">#{item.student_auth_id}</td>
              <td className="px-4 py-3 text-slate-600">{item.exam_title} <small className="text-slate-400">#{item.exam_id}</small></td>
              <td className="px-4 py-3 text-slate-500">{item.field === "physics" ? "فیزیک" : "کامپیوتر"}</td>
              <td className="px-4 py-3 text-slate-500">{dateTime(item.registered_at)}</td>
              <td className="px-4 py-3"><span className={"rounded-full px-3 py-1 text-[10px] font-bold " + (item.status === "registered" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{item.status === "registered" ? "فعال" : "لغوشده"}</span></td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="p-8 text-center text-xs text-slate-400">ثبت‌نامی برای این فیلتر وجود ندارد.</p>}
      </section>
    </div>
  );
}
