"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Kind = "articles" | "exams" | "pages" | "mentors";
type Row = { id: number; title: string; slug?: string; status?: string; first_name?: string; last_name?: string };
type Values = Record<string, string>;

const labels: Record<Kind, string> = {
  articles: "مقالات و بلاگ",
  exams: "آزمون‌ها",
  pages: "صفحات سایت",
  mentors: "مشاوران",
};
const defaults: Record<Kind, Values> = {
  articles: { slug: "", title: "", excerpt: "", body: "", category: "المپیاد فیزیک", tags: "", cover_image_url: "", status: "draft" },
  exams: { slug: "", title: "", description: "", field: "physics", stage: "مرحله اول", starts_at: "", duration_minutes: "0", registration_url: "", cover_image_url: "", status: "draft" },
  pages: { slug: "", title: "", description: "", content: "", image_url: "", status: "draft" },
  mentors: { first_name: "", last_name: "", field: "physics", bio: "", achievements: "", specialties: "", experience: "", image_url: "", medals: "", education: "", capacity: "3", status: "active", is_public: "true" },
};
const endpoints: Record<Kind, string> = { articles: "/content/admin/articles", exams: "/content/admin/exams", pages: "/content/admin/pages", mentors: "/people/admin/mentors" };

export default function AdminPage() {
  const [kind, setKind] = useState<Kind>("articles");
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<Values>(defaults.articles);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = useMemo(() => Object.keys(defaults[kind]), [kind]);

  async function load(nextKind: Kind = kind) {
    setError("");
    try {
      const response = await fetch(endpoints[nextKind], { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "ابتدا وارد پنل مدیریت شوید." : "دریافت اطلاعات ناموفق بود.");
      const data = await response.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ارتباط"); }
  }

  useEffect(() => { setValues(defaults[kind]); setSelected(null); setMessage(""); void load(kind); }, [kind]);

  function choose(row: Row & Record<string, unknown>) {
    setSelected(row.id);
    const next = { ...defaults[kind] };
    for (const key of fields) {
      const value = row[key];
      next[key] = value == null ? "" : typeof value === "boolean" ? String(value) : String(value);
    }
    setValues(next);
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const payload: Record<string, unknown> = { ...values };
    if (kind === "exams" || kind === "mentors") payload.capacity = Number(values.capacity || 0);
    if (kind === "exams") payload.duration_minutes = Number(values.duration_minutes || 0);
    if (kind === "mentors") payload.is_public = values.is_public === "true";
    try {
      const response = await fetch(selected ? endpoints[kind] + "/" + selected : endpoints[kind], {
        method: selected ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "ذخیره اطلاعات انجام نشد.");
      setMessage("تغییرات با موفقیت ذخیره شد.");
      setSelected(null); setValues(defaults[kind]); await load(kind);
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ارتباط"); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-bold text-blue-700">CHEKAD CMS</p><h1 className="text-3xl font-black text-slate-900">مدیریت محتوای چکاد</h1><p className="mt-2 text-sm text-slate-600">مدیریت صفحات، بلاگ، آزمون‌ها و پروفایل مشاوران</p></div>
          <Link href="/admin/login" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">ورود مدیر</Link>
        </header>
        <nav className="mb-6 flex flex-wrap gap-2">
          {(Object.keys(labels) as Kind[]).map((item) => <button key={item} onClick={() => setKind(item)} className={"rounded-xl px-4 py-3 text-sm font-bold " + (kind === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700")}>{labels[item]}</button>)}
        </nav>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,1.1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">محتوای ثبت‌شده</h2><button onClick={() => { setSelected(null); setValues(defaults[kind]); }} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">مورد جدید</button></div>
            <div className="space-y-2">
              {rows.map((row) => <button key={row.id} onClick={() => choose(row as Row & Record<string, unknown>)} className={"block w-full rounded-xl border p-3 text-right transition hover:border-blue-400 " + (selected === row.id ? "border-blue-500 bg-blue-50" : "border-slate-200")}>
                <span className="block font-bold text-slate-900">{row.title || [row.first_name, row.last_name].filter(Boolean).join(" ")}</span><span className="mt-1 block text-xs text-slate-500">شناسه: {row.slug || row.id} · {row.status || "ثبت‌شده"}</span>
              </button>)}
              {rows.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">هنوز موردی ثبت نشده است.</p>}
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-extrabold">{selected ? "ویرایش مورد انتخاب‌شده" : "ایجاد مورد جدید"}</h2>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                const long = ["body", "content", "description", "bio", "achievements", "experience", "medals", "excerpt"].includes(field);
                const choices: Record<string, string[]> = { status: kind === "mentors" ? ["active", "inactive", "paused"] : kind === "exams" ? ["draft", "published", "upcoming", "closed", "completed"] : ["draft", "published"], field: ["physics", "computer"], is_public: ["true", "false"] };
                const options = choices[field];
                return <label key={field} className={"block text-sm font-semibold text-slate-700 " + (long ? "sm:col-span-2" : "")}><span className="mb-1 block">{field}</span>
                  {options ? <select value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> :
                  long ? <textarea rows={field === "body" || field === "content" ? 7 : 3} value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /> :
                  <input value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />}
                </label>;
              })}
              <div className="flex flex-wrap gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "در حال ذخیره..." : selected ? "ذخیره تغییرات" : "ایجاد و ذخیره"}</button><button type="button" onClick={() => { setSelected(null); setValues(defaults[kind]); }} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">پاک‌کردن فرم</button></div>
            </form>
            <p className="mt-4 text-xs leading-6 text-slate-500">تصاویر فعلاً با نشانی HTTPS ثبت می‌شوند؛ بارگذاری مستقیم فایل و مدیریت رسانه در مرحله بعد اضافه می‌شود. انتشار فقط پس از تکمیل و بازبینی محتوا انجام شود.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
