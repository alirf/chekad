"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Invoice = {
  id: number;
  invoice_number: string;
  student_auth_id: number;
  service_type: "mentorship" | "tutoring" | "other";
  application_id?: number | null;
  title: string;
  amount_toman: number;
  due_date?: string | null;
  status: "issued" | "paid" | "void" | "overdue";
  payment_reference?: string | null;
  created_at: string;
};
const money = (value: number) => new Intl.NumberFormat("fa-IR").format(value) + " تومان";
async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "درخواست انجام نشد.");
  return data as T;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [studentId, setStudentId] = useState("");
  const [serviceType, setServiceType] = useState<"mentorship" | "tutoring" | "other">("other");
  const [applicationId, setApplicationId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const result = await json<{ items: Invoice[]; total: number }>(await fetch("/api/application/admin/invoices", { credentials: "same-origin", cache: "no-store" }));
    setInvoices(result.items);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/application/admin/invoices", { credentials: "same-origin", cache: "no-store" }).then(json<{ items: Invoice[]; total: number }>)
      .then((result) => { if (active) setInvoices(result.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت فاکتورها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const created = await json<Invoice>(await fetch("/api/application/admin/invoices", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_auth_id: Number(studentId),
          service_type: serviceType,
          application_id: applicationId ? Number(applicationId) : null,
          title,
          description: description || null,
          amount_toman: Number(amount),
          due_date: dueDate || null,
          payment_instructions: instructions || null,
        }),
      }));
      setNotice("فاکتور " + created.invoice_number + " صادر شد.");
      setStudentId(""); setApplicationId(""); setTitle(""); setAmount(""); setDescription(""); setDueDate(""); setInstructions("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "صدور فاکتور انجام نشد."); }
    finally { setBusy(false); }
  }

  async function markPaid(invoice: Invoice) {
    const reference = window.prompt("شناسه رسید یا مرجع پرداخت را وارد کن (اختیاری):", "");
    if (reference === null) return;
    setError(""); setNotice("");
    try {
      await json(await fetch("/api/application/admin/invoices/" + invoice.id, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", payment_reference: reference.trim() || null }),
      }));
      setNotice("وضعیت فاکتور به پرداخت‌شده تغییر کرد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت پرداخت انجام نشد."); }
  }

  async function voidInvoice(invoice: Invoice) {
    if (!window.confirm("فاکتور " + invoice.invoice_number + " باطل شود؟")) return;
    try {
      await json(await fetch("/api/application/admin/invoices/" + invoice.id, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "void" }),
      }));
      setNotice("فاکتور باطل شد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ابطال فاکتور انجام نشد."); }
  }

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold tracking-widest text-blue-600">BILLING</p><h1 className="mt-1 text-2xl font-black text-slate-900">صدور و مدیریت فاکتورها</h1><p className="mt-1 text-sm text-slate-500">برای حساب دانش‌آموز صورتحساب صادر و پس از بررسی رسید، پرداخت را دستی تأیید کن.</p></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}
      <form onSubmit={create} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <div className="md:col-span-2"><h2 className="font-black text-slate-900">فاکتور جدید</h2><p className="mt-1 text-xs text-slate-500">شناسه حساب دانش‌آموز از سرویس احراز هویت گرفته می‌شود؛ پیش از صدور با پرونده درست تطبیق بده.</p></div>
        <label className="grid gap-1 text-xs font-bold text-slate-600">شناسه حساب دانش‌آموز<input type="number" min="1" value={studentId} onChange={(event) => setStudentId(event.target.value)} required className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">نوع خدمت<select value={serviceType} onChange={(event) => setServiceType(event.target.value as typeof serviceType)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="other">سایر</option><option value="mentorship">منتورینگ</option><option value="tutoring">کلاس خصوصی</option></select></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">شناسه درخواست (برای منتورینگ/کلاس الزامی)<input type="number" min="1" value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">عنوان فاکتور<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={180} required className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">مبلغ به تومان<input type="number" min="1" max="1000000000000" value={amount} onChange={(event) => setAmount(event.target.value)} required className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">تاریخ سررسید<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2">توضیحات<textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-lg border border-slate-200 p-3 text-sm" /></label>
        <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2">راهنمای پرداخت / ارسال رسید<textarea rows={2} value={instructions} onChange={(event) => setInstructions(event.target.value)} className="rounded-lg border border-slate-200 p-3 text-sm" /></label>
        <button type="submit" disabled={busy || !studentId || Number(amount) < 1} className="justify-self-start rounded-lg bg-blue-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "در حال صدور..." : "صدور فاکتور"}</button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black text-slate-900">فاکتورهای اخیر</h2><p className="mt-1 text-xs text-slate-500">{invoices.length} فاکتور</p></div>
        {loading ? <p className="p-8 text-center text-xs text-slate-400">در حال بارگذاری...</p> : invoices.length ? <div className="divide-y divide-slate-100">
          {invoices.map((invoice) => <article key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div><strong className="block text-sm text-slate-800">{invoice.title} · {invoice.invoice_number}</strong><small className="text-xs text-slate-400">حساب دانش‌آموزی #{invoice.student_auth_id} · {money(invoice.amount_toman)} · {invoice.due_date || "بدون سررسید"}</small></div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-600">{invoice.status === "paid" ? "پرداخت‌شده" : invoice.status === "void" ? "باطل" : "صادرشده"}</span>{invoice.status === "issued" && <><button type="button" onClick={() => markPaid(invoice)} className="rounded-lg border border-emerald-100 px-3 py-2 text-[10px] font-bold text-emerald-700">ثبت پرداخت</button><button type="button" onClick={() => voidInvoice(invoice)} className="rounded-lg border border-red-100 px-3 py-2 text-[10px] font-bold text-red-600">ابطال</button></>}</div>
          </article>)}
        </div> : <p className="p-8 text-center text-xs text-slate-400">فاکتوری ثبت نشده است.</p>}
      </section>
    </div>
  );
}
