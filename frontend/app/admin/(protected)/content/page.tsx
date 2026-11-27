"use client";

import Link from "next/link";
import { MarkdownContent } from "../../../../components/markdown-content";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Kind = "articles" | "exams" | "pages" | "mentors" | "tutors";
type Row = { id: number; title?: string; slug?: string; status?: string; first_name?: string; last_name?: string } & Record<string, unknown>;
type Values = Record<string, string>;
type SectionType = "heading" | "text" | "image" | "features" | "cta";
type PageSection = { type: SectionType; title?: string; body?: string; image_url?: string; items?: string[]; button_label?: string; url?: string };

const labels: Record<Kind, string> = {
  articles: "مقالات و بلاگ",
  exams: "آزمون‌ها",
  pages: "صفحات سایت",
  mentors: "مشاوران",
  tutors: "مدرسان",
};
const defaults: Record<Kind, Values> = {
  articles: { slug: "", title: "", excerpt: "", body: "", category: "عمومی", tags: "", cover_image_url: "", status: "draft" },
  exams: { slug: "", title: "", description: "", field: "physics", stage: "", starts_at: "", duration_minutes: "0", registration_url: "", cover_image_url: "", status: "draft" },
  pages: { slug: "", title: "", description: "", content: "", sections: "[]", layout: "standard", image_url: "", seo_title: "", seo_description: "", status: "draft" },
  mentors: { first_name: "", last_name: "", field: "physics", bio: "", achievements: "", specialties: "", experience: "", image_url: "", medals: "", education: "", capacity: "3", status: "active", is_public: "true" },
  tutors: { first_name: "", last_name: "", field: "physics", bio: "", specialties: "", experience: "", image_url: "", medals: "", education: "", capacity: "5", status: "active", is_public: "true" },
};
const endpoints: Record<Kind, string> = {
  articles: "/api/content/admin/articles",
  exams: "/api/content/admin/exams",
  pages: "/api/content/admin/pages",
  mentors: "/api/people/admin/mentors",
  tutors: "/api/people/admin/tutors",
};
const pagePaths: Record<string, string> = {
  home: "/", about: "/about", contact: "/contact", mentorship: "/mentorship",
  tutoring: "/tutoring", exams: "/exams", blog: "/blog", privacy: "/privacy",
  terms: "/terms", "olympiad-physics": "/olympiads/physics",
  "olympiad-computer": "/olympiads/computer",
};
const fieldNames: Record<string, string> = {
  slug: "شناسه یکتا (انگلیسی)",
  title: "عنوان",
  excerpt: "خلاصه مقاله",
  body: "متن مقاله (Markdown)",
  category: "دسته‌بندی",
  tags: "برچسب‌ها (با کاما جدا کنید)",
  cover_image_url: "تصویر شاخص",
  description: "توضیحات",
  field: "رشته المپیاد",
  stage: "مرحله",
  starts_at: "زمان برگزاری",
  duration_minutes: "مدت آزمون (دقیقه)",
  registration_url: "لینک ثبت‌نام",
  sections: "بخش‌های صفحه",
  layout: "قالب صفحه",
  image_url: "تصویر اصلی",
  seo_title: "عنوان سئو",
  seo_description: "توضیحات سئو",
  first_name: "نام",
  last_name: "نام خانوادگی",
  bio: "معرفی",
  achievements: "افتخارات",
  specialties: "تخصص‌ها",
  experience: "سابقه و تجربه",
  medals: "مدال‌ها",
  education: "تحصیلات",
  capacity: "ظرفیت پذیرش",
  status: "وضعیت",
  is_public: "نمایش عمومی",
};
function parseSections(value: string): PageSection[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is PageSection => !!item && typeof item === "object" && ["heading", "text", "image", "features", "cta"].includes(String((item as PageSection).type))) : [];
  } catch { return []; }
}

export default function AdminPage() {
  const [kind, setKind] = useState<Kind>("articles");
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<Values>(defaults.articles);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const articleBodyRef = useRef<HTMLTextAreaElement>(null);
  const fields = useMemo(() => Object.keys(defaults[kind]), [kind]);
  const sections = useMemo(() => parseSections(values.sections || "[]"), [values.sections]);

  async function load(nextKind: Kind = kind) {
    setError("");
    try {
      const response = await fetch(endpoints[nextKind], { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "ابتدا وارد پنل مدیریت شوید." : "دریافت اطلاعات ناموفق بود.");
      const data: unknown = await response.json();
      setRows(Array.isArray(data) ? data as Row[] : []);
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ارتباط"); }
  }

  useEffect(() => {
    let active = true;
    fetch(endpoints[kind], { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.status === 401 ? "ابتدا وارد پنل مدیریت شوید." : "دریافت اطلاعات ناموفق بود.");
        }
        return response.json();
      })
      .then((data: unknown) => {
        if (active) setRows(Array.isArray(data) ? data as Row[] : []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "خطای ارتباط");
      });
    return () => { active = false; };
  }, [kind]);

  function choose(row: Row) {
    setSelected(row.id);
    const next = { ...defaults[kind] };
    for (const key of fields) {
      const value = row[key];
      next[key] = value == null ? "" : key === "sections" ? JSON.stringify(value, null, 2) : String(value);
    }
    setValues(next); setMessage("");
  }

  async function uploadImage(file: File, onUploaded: (url: string) => void) {
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/content/admin/media", { method: "POST", credentials: "same-origin", body: form });
      const result = await response.json().catch(() => ({})) as { url?: string; detail?: string };
      if (!response.ok || !result.url) throw new Error(result.detail || "بارگذاری تصویر انجام نشد.");
      onUploaded(result.url);
      setMessage("تصویر با موفقیت بارگذاری شد.");
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در بارگذاری تصویر"); }
    finally { setBusy(false); }
  }

  function updateSection(index: number, patch: Partial<PageSection>) {
    const next = sections.map((section, i) => i === index ? { ...section, ...patch } : section);
    setValues((v) => ({ ...v, sections: JSON.stringify(next, null, 2) }));
  }
  function addSection() {
    const next = [...sections, { type: "text" as const, title: "عنوان بخش", body: "متن این بخش را وارد کنید." }];
    setValues((v) => ({ ...v, sections: JSON.stringify(next, null, 2) }));
  }
  function removeSection(index: number) {
    setValues((v) => ({ ...v, sections: JSON.stringify(sections.filter((_, i) => i !== index), null, 2) }));
  }
  function moveSection(index: number, direction: -1 | 1) {
    const next = [...sections]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setValues((v) => ({ ...v, sections: JSON.stringify(next, null, 2) }));
  }

  function formatArticle(before: string, after = before) {
    const textarea = articleBodyRef.current;
    const start = textarea?.selectionStart ?? values.body.length;
    const end = textarea?.selectionEnd ?? values.body.length;
    const current = values.body || "";
    const selectedText = current.slice(start, end) || "متن";
    const next = current.slice(0, start) + before + selectedText + after + current.slice(end);
    setValues((v) => ({ ...v, body: next }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const payload: Record<string, unknown> = { ...values };
    if (kind === "pages") {
      try { payload.sections = JSON.parse(values.sections || "[]"); }
      catch { setBusy(false); setError("ساختار بخش‌های صفحه معتبر نیست."); return; }
    }
    if (kind === "exams" || kind === "mentors" || kind === "tutors") payload.capacity = Number(values.capacity || (kind === "exams" ? 0 : 3));
    if (kind === "exams") payload.duration_minutes = Number(values.duration_minutes || 0);
    if (kind === "mentors" || kind === "tutors") payload.is_public = values.is_public === "true";
    try {
      const response = await fetch(selected ? endpoints[kind] + "/" + selected : endpoints[kind], {
        method: selected ? "PUT" : "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { detail?: string };
      if (!response.ok) throw new Error(result.detail || "ذخیره اطلاعات انجام نشد.");
      setMessage("تغییرات با موفقیت ذخیره شد.");
      setSelected(null); setValues(defaults[kind]); await load(kind);
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ارتباط"); }
    finally { setBusy(false); }
  }

  async function removeSelected() {
    if (!selected || !window.confirm("این مورد برای همیشه حذف شود؟")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoints[kind] + "/" + selected, { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("حذف مورد انجام نشد.");
      setSelected(null); setValues(defaults[kind]); setMessage("مورد حذف شد."); await load(kind);
    } catch (e) { setError(e instanceof Error ? e.message : "خطای ارتباط"); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-bold text-blue-700">CHEKAD CMS</p><h1 className="text-3xl font-black text-slate-900">مدیریت محتوای چکاد</h1><p className="mt-2 text-sm text-slate-600">مدیریت بلاگ، آزمون‌ها، صفحات و پروفایل تیم آموزشی</p></div>
          <Link href="/admin/login" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">ورود مدیر</Link>
        </header>
        <nav className="mb-6 flex flex-wrap gap-2">
          {(Object.keys(labels) as Kind[]).map((item) => <button type="button" key={item} onClick={() => { setValues(defaults[item]); setSelected(null); setMessage(""); setKind(item); }} className={"rounded-xl px-4 py-3 text-sm font-bold " + (kind === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700")}>{labels[item]}</button>)}
        </nav>
        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,1.3fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold">محتوای ثبت‌شده</h2><button type="button" onClick={() => { setSelected(null); setValues(defaults[kind]); setMessage(""); }} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">مورد جدید</button></div>
            <div className="space-y-2">
              {rows.map((row) => <button type="button" key={row.id} onClick={() => choose(row)} className={"block w-full rounded-xl border p-3 text-right transition hover:border-blue-400 " + (selected === row.id ? "border-blue-500 bg-blue-50" : "border-slate-200")}>
                <span className="block font-bold text-slate-900">{String(row.title || [row.first_name, row.last_name].filter(Boolean).join(" "))}</span><span className="mt-1 block text-xs text-slate-500">شناسه: {String(row.slug || row.id)} · {String(row.status || "ثبت‌شده")}</span>
              </button>)}
              {rows.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">هنوز موردی ثبت نشده است.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-extrabold">{selected ? "ویرایش مورد انتخاب‌شده" : "ایجاد مورد جدید"}</h2>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => {
                if (field === "sections") return (
                  <div key={field} className="sm:col-span-2 rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-extrabold text-slate-800">صفحه‌ساز بلوکی</h3><p className="text-xs text-slate-500">بخش‌ها را اضافه، حذف و جابه‌جا کنید؛ ترتیب آن‌ها در صفحه عمومی حفظ می‌شود.</p></div><button type="button" onClick={addSection} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white">افزودن بخش +</button></div>
                    <div className="space-y-3">
                      {sections.map((section, index) => <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">بخش {index + 1}</strong><div className="flex gap-1"><button type="button" onClick={() => moveSection(index, -1)} className="rounded-md border bg-white px-2 py-1 text-xs" aria-label="انتقال به بالا">↑</button><button type="button" onClick={() => moveSection(index, 1)} className="rounded-md border bg-white px-2 py-1 text-xs" aria-label="انتقال به پایین">↓</button><button type="button" onClick={() => removeSection(index)} className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700">حذف</button></div></div>
                        <label className="mb-2 block text-xs font-semibold">نوع بخش<select value={section.type} onChange={(e) => updateSection(index, { type: e.target.value as SectionType })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="heading">تیتر / معرفی</option><option value="text">متن</option><option value="image">تصویر</option><option value="features">فهرست ویژگی‌ها</option><option value="cta">دعوت به اقدام</option></select></label>
                        {section.type !== "image" && <label className="mb-2 block text-xs font-semibold">عنوان<input value={section.title || ""} onChange={(e) => updateSection(index, { title: e.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>}
                        {["heading", "text", "cta"].includes(section.type) && <label className="mb-2 block text-xs font-semibold">متن<textarea rows={3} value={section.body || ""} onChange={(e) => updateSection(index, { body: e.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>}
                        {section.type === "features" && <label className="mb-2 block text-xs font-semibold">موارد فهرست (هر مورد در یک خط)<textarea rows={3} value={(section.items || []).join("\n")} onChange={(e) => updateSection(index, { items: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>}
                        {["image", "cta"].includes(section.type) && <div className="mb-2"><label className="block text-xs font-semibold">نشانی تصویر یا مقصد</label><input value={section.image_url || section.url || ""} onChange={(e) => updateSection(index, section.type === "image" ? { image_url: e.target.value } : { url: e.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" />{section.type === "image" && <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file, (url) => updateSection(index, { image_url: url })); }} />}</div>}
                        {section.type === "cta" && <label className="block text-xs font-semibold">متن دکمه<input value={section.button_label || ""} onChange={(e) => updateSection(index, { button_label: e.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2" /></label>}
                        {section.image_url && <img src={section.image_url} alt="" className="mt-2 max-h-36 rounded-lg object-contain" />}
                      </div>)}
                      {sections.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">هنوز بخشی اضافه نشده است.</p>}
                    </div>
                  </div>
                );
                const long = ["body", "content", "description", "bio", "achievements", "experience", "medals", "excerpt", "seo_description"].includes(field);
                const choices: Record<string, string[]> = {
                  status: kind === "mentors" || kind === "tutors" ? ["active", "inactive", "paused"] : kind === "exams" ? ["draft", "published", "upcoming", "closed", "completed"] : ["draft", "published"],
                  field: ["physics", "computer"], is_public: ["true", "false"],
                  layout: ["standard", "wide", "narrow", "split"],
                };
                const options = choices[field];
                const imageField = ["cover_image_url", "image_url"].includes(field);
                return <label key={field} className={"block text-sm font-semibold text-slate-700 " + (long || imageField ? "sm:col-span-2" : "")}><span className="mb-1 block">{fieldNames[field] || field}</span>
                  {options ? <select value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> :
                  long ? <>{field === "body" && <div className="mb-2 flex flex-wrap gap-1"><button type="button" onClick={() => formatArticle("**")} className="rounded-md border px-2 py-1 text-xs">Bold</button><button type="button" onClick={() => formatArticle("*")} className="rounded-md border px-2 py-1 text-xs">Italic</button><button type="button" onClick={() => formatArticle("\n## ")} className="rounded-md border px-2 py-1 text-xs">Heading</button><button type="button" onClick={() => formatArticle("\n- ")} className="rounded-md border px-2 py-1 text-xs">List</button></div>}<textarea ref={field === "body" ? articleBodyRef : undefined} rows={field === "body" || field === "content" ? 10 : 4} value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></> :
                  <input type={field === "duration_minutes" || field === "capacity" ? "number" : field === "starts_at" ? "datetime-local" : "text"} value={values[field] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />}
                  {field === "slug" && kind === "pages" && <p className="mt-1 text-xs leading-6 text-blue-700">شناسه‌های ویژه برای ویرایش مسیرهای فعلی: home، about، contact، mentorship، tutoring، exams، blog، privacy، terms، olympiad-physics، olympiad-computer. سایر شناسه‌ها در مسیر /pages/ نمایش داده می‌شوند.</p>}
                  {imageField && <><input type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-xs" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file, (url) => setValues((v) => ({ ...v, [field]: url }))); }} /><p className="mt-1 text-xs text-slate-500">JPEG، PNG یا WebP؛ حداکثر ۵ مگابایت.</p></>}
                  {imageField && values[field] && <img src={values[field]} alt="پیش‌نمایش تصویر" className="mt-3 max-h-44 rounded-xl object-contain" />}
                </label>;
              })}
              {kind === "articles" && <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="mb-2 text-sm font-bold text-slate-700">پیش‌نمایش نوشتار</p><div className="mb-2 text-lg font-extrabold text-slate-900">{values.title || "عنوان مقاله"}</div>{values.body ? <MarkdownContent source={values.body} /> : <p className="text-sm leading-8 text-slate-600">متن مقاله پس از نوشتن در این بخش پیش‌نمایش داده می‌شود.</p>}</div>}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button disabled={busy} className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "در حال انجام..." : selected ? "ذخیره تغییرات" : "ایجاد و ذخیره"}</button>
                {kind === "pages" && values.slug && <Link href={pagePaths[values.slug] || "/pages/" + values.slug} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-300 px-5 py-3 font-bold">مشاهده صفحه عمومی</Link>}
                {selected && <button type="button" disabled={busy} onClick={() => void removeSelected()} className="rounded-xl border border-red-200 px-5 py-3 font-bold text-red-700 disabled:opacity-50">حذف مورد</button>}
                <button type="button" onClick={() => { setSelected(null); setValues(defaults[kind]); }} className="rounded-xl border border-slate-300 px-5 py-3 font-bold">پاک‌کردن فرم</button>
              </div>
            </form>
            <p className="mt-4 text-xs leading-6 text-slate-500">تصویرها در فضای ذخیره‌سازی ماندگار چکاد نگهداری می‌شوند. پیش از انتشار، محتوا و لینک‌ها را بازبینی کنید. فقط مدیر احراز هویت‌شده به عملیات ایجاد، ویرایش، حذف و بارگذاری دسترسی دارد.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
