"use client";
import { useEffect, useState } from "react";

type Cohort = {
  cohort_date: string;
  students: number;
  d1_retained: number | null;
  d1_rate: number | null;
  d7_retained: number | null;
  d7_rate: number | null;
  d30_retained: number | null;
  d30_rate: number | null;
};
type RetentionReport = {
  period_days: number;
  tracked_students: number;
  active_students_7d: number;
  active_students_30d: number;
  returning_students_7d: number;
  cohorts: Cohort[];
  retention_basis: string;
};
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
}
function percent(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value) + "٪";
}
function count(value: number | null) {
  return value === null ? "—" : value.toLocaleString("fa-IR");
}

export default function AdminRetentionPage() {
  const [days, setDays] = useState("30");
  const [report, setReport] = useState<RetentionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch("/api/application/admin/retention?days=" + days, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "دریافت گزارش Retention انجام نشد.");
        return data as RetentionReport;
      })
      .then((data) => { if (active) setReport(data); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "خطای ارتباط با سرور"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  const metrics: Array<[string, number | undefined]> = [
    ["دانش‌آموزان رهگیری‌شده", report?.tracked_students],
    ["فعال در ۷ روز اخیر", report?.active_students_7d],
    ["فعال در ۳۰ روز اخیر", report?.active_students_30d],
    ["بازگشته در دست‌کم ۲ روز از ۷ روز", report?.returning_students_7d],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-600">PRODUCT ANALYTICS</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">ماندگاری و بازگشت دانش‌آموزان</h1>
          <p className="mt-1 max-w-2xl text-sm leading-7 text-slate-500">بازگشت بر اساس روزهای مجزایی محاسبه می‌شود که دانش‌آموز با نشست معتبر وارد پنل شده است.</p>
        </div>
        <label className="grid gap-1 text-xs font-bold text-slate-600">بازه بررسی
          <select value={days} onChange={(event) => setDays(event.target.value)} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
            <option value="30">۳۰ روز اخیر</option>
            <option value="60">۶۰ روز اخیر</option>
            <option value="90">۹۰ روز اخیر</option>
          </select>
        </label>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-xs font-bold text-slate-500">{label}</span>
            <strong className="mt-2 block text-2xl font-black text-slate-900">{loading ? "—" : Number(value || 0).toLocaleString("fa-IR")}</strong>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-black text-slate-800">جدول Cohort روزانه</h2>
          <p className="mt-1 text-xs leading-6 text-slate-500">D1، D7 و D30 یعنی حضور مجدد دقیقاً در روز اول، هفتم و سی‌ام پس از نخستین روز ورود ثبت‌شده.</p>
        </div>
        {loading ? <p className="p-8 text-center text-sm text-slate-400">در حال محاسبه...</p> : report?.cohorts.some((item) => item.students > 0) ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr>
                <th className="p-3">تاریخ ورود اولیه</th><th className="p-3">اندازه Cohort</th>
                <th className="p-3">D1 بازگشته</th><th className="p-3">D1</th>
                <th className="p-3">D7 بازگشته</th><th className="p-3">D7</th>
                <th className="p-3">D30 بازگشته</th><th className="p-3">D30</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {report.cohorts.filter((item) => item.students > 0).map((item) => (
                  <tr key={item.cohort_date} className="text-slate-700">
                    <td className="p-3 font-bold">{dateLabel(item.cohort_date)}</td>
                    <td className="p-3">{item.students.toLocaleString("fa-IR")}</td>
                    <td className="p-3">{count(item.d1_retained)}</td><td className="p-3 font-bold">{percent(item.d1_rate)}</td>
                    <td className="p-3">{count(item.d7_retained)}</td><td className="p-3 font-bold">{percent(item.d7_rate)}</td>
                    <td className="p-3">{count(item.d30_retained)}</td><td className="p-3 font-bold">{percent(item.d30_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="p-8 text-center text-sm text-slate-400">هنوز داده کافی برای تشکیل Cohort ثبت نشده است.</p>}
      </section>
      <p className="text-xs leading-6 text-slate-400">مبنای محاسبه: {report?.retention_basis || "—"}. داده‌ها از زمان فعال‌شدن رهگیری جمع می‌شوند؛ روزهای قبل از آن قابل بازسازی نیستند. شناسه داخلی حساب فقط برای حذف رویداد تکراری و محاسبه cohort در دیتابیس نگهداری می‌شود و در گزارش نمایش داده نمی‌شود؛ متن پیام، گزارش و سایر محتوای شخصی ذخیره نمی‌شود.</p>
    </div>
  );
}
