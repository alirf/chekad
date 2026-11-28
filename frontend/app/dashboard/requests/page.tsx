"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStudentSession } from "../../../components/student-session-provider";

type Offer = {
  id: number; kind: "mentorship" | "tutoring"; application_id: number; tracking_code: string;
  application_title: string; field: "physics" | "computer"; topic?: string | null;
  person_name: string; description: string; price_toman: number | null; terms: string;
  expires_at: string | null; created_at: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "دریافت اطلاعات انجام نشد.");
  return data as T;
}

const money = (value: number | null) => value === null ? "پس از هماهنگی" : new Intl.NumberFormat("fa-IR").format(value) + " تومان";

export default function StudentRequestOffersPage() {
  const { status: sessionStatus } = useStudentSession();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const data = await readJson<{ items: Offer[] }>(await fetch("/api/application/student/application-offers", { credentials: "same-origin", cache: "no-store" }));
    setOffers(data.items);
  }, []);

  useEffect(() => {
    if (sessionStatus === "checking") return;
    let active = true;
    load().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت پیشنهادها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, sessionStatus]);

  async function selectOffer(offer: Offer) {
    const confirmed = window.confirm("آیا مطمئنی که می‌خواهی «" + offer.person_name + "» را برای این درخواست انتخاب کنی؟ پس از تأیید، سایر گزینه‌ها بسته می‌شوند.");
    if (!confirmed) return;
    setBusyId(offer.id); setError(""); setNotice("");
    try {
      await readJson(await fetch("/api/application/student/application-offers/" + offer.id + "/select", { method: "POST", credentials: "same-origin" }));
      setNotice("انتخابت ثبت شد. تیم چکاد برای نهایی‌سازی تخصیص و زمان‌بندی اقدام می‌کند.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت انتخاب انجام نشد."); }
    finally { setBusyId(null); }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-2"><p className="text-xs font-bold tracking-[0.2em] text-blue-600">YOUR OPTIONS</p><h1 className="text-2xl font-black text-slate-900">پیشنهادهای منتور و مدرس</h1><p className="text-sm leading-7 text-slate-500">گزینه‌های پیشنهادی چکاد را با دقت بررسی کن. با انتخاب یک گزینه، درخواستت برای نهایی‌سازی تخصیص به تیم چکاد ارسال می‌شود.</p></header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}
      {loading || sessionStatus === "checking" ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">در حال دریافت پیشنهادها...</div> : offers.length ? (
        <div className="grid gap-4 md:grid-cols-2">{offers.map((offer) => (
          <article key={offer.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><span className="text-[11px] font-bold text-blue-600">{offer.kind === "mentorship" ? "منتورینگ" : "کلاس خصوصی"} · {offer.field === "physics" ? "المپیاد فیزیک" : "المپیاد کامپیوتر"}</span><h2 className="mt-2 text-lg font-black text-slate-900">{offer.person_name}</h2><p className="mt-1 text-xs text-slate-400">درخواست {offer.tracking_code}{offer.topic ? " · " + offer.topic : ""}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">پیشنهاد جدید</span></div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{offer.description}</p>
            <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-500">هزینه پیشنهادی</span><strong className="text-slate-900">{money(offer.price_toman)}</strong></div><div className="mt-3 border-t border-slate-200 pt-3"><strong className="text-xs text-slate-700">شرایط همکاری</strong><p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-600">{offer.terms}</p></div>{offer.expires_at && <p className="mt-3 text-[11px] text-amber-700">مهلت انتخاب: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(offer.expires_at))}</p>}</div>
            <button type="button" disabled={busyId !== null} onClick={() => selectOffer(offer)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50">{busyId === offer.id ? "در حال ثبت انتخاب..." : "انتخاب این گزینه"}</button>
          </article>
        ))}</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center"><div className="text-3xl text-slate-300">◎</div><h2 className="mt-3 font-black text-slate-800">پیشنهاد فعالی نداری</h2><p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">وقتی تیم چکاد گزینه‌های مناسب درخواستت را آماده کند، اینجا می‌توانی مشخصات و شرایط آن‌ها را ببینی و انتخاب کنی.</p><Link href="/dashboard" className="mt-5 inline-flex rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">بازگشت به داشبورد</Link></div>
      )}
    </main>
  );
}
