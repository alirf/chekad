"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Person = { id: number; first_name: string; last_name: string; field: "physics" | "computer"; status: string; is_public: boolean; capacity: number };
type Account = { id: number; mentor_profile_id: number; phone: string; display_name: string; is_active: boolean; created_at: string };
async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "درخواست انجام نشد.");
  return data as T;
}

export default function MentorAccountsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profileId, setProfileId] = useState("");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const available = useMemo(() => people.filter((person) =>
    person.status === "active" &&
    person.is_public &&
    !accounts.some((account) => account.mentor_profile_id === person.id)
  ), [people, accounts]);

  const load = useCallback(async () => {
    const [peopleData, accountData] = await Promise.all([
      json<Person[]>(await fetch("/api/people/admin/mentors", { credentials: "same-origin", cache: "no-store" })),
      json<{ items: Account[]; total: number }>(await fetch("/api/auth/admin/mentor-accounts", { credentials: "same-origin", cache: "no-store" })),
    ]);
    setPeople(peopleData);
    setAccounts(accountData.items);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/people/admin/mentors", { credentials: "same-origin", cache: "no-store" }).then(json<Person[]>),
      fetch("/api/auth/admin/mentor-accounts", { credentials: "same-origin", cache: "no-store" }).then(json<{ items: Account[]; total: number }>),
    ]).then(([peopleData, accountData]) => {
      if (!active) return;
      setPeople(peopleData);
      setAccounts(accountData.items);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت حساب‌ها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function selectProfile(id: string) {
    setProfileId(id);
    const person = people.find((item) => String(item.id) === id);
    if (person) setDisplayName(person.first_name + " " + person.last_name);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const account = await json<Account>(await fetch("/api/auth/admin/mentor-accounts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentor_profile_id: Number(profileId), phone, display_name: displayName, password }),
      }));
      setNotice("حساب ورود مشاور «" + account.display_name + "» ساخته شد.");
      setProfileId(""); setPhone(""); setDisplayName(""); setPassword("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ساخت حساب مشاور انجام نشد."); }
    finally { setBusy(false); }
  }

  async function toggle(account: Account) {
    setError(""); setNotice("");
    try {
      await json(await fetch("/api/auth/admin/mentor-accounts/" + account.id + "?is_active=" + String(!account.is_active), {
        method: "PATCH", credentials: "same-origin",
      }));
      setNotice(account.is_active ? "دسترسی حساب مشاور غیرفعال شد." : "دسترسی حساب مشاور فعال شد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر وضعیت حساب انجام نشد."); }
  }

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold tracking-widest text-blue-600">MENTOR ACCESS</p><h1 className="mt-1 text-2xl font-black text-slate-900">حساب‌های مشاوران</h1><p className="mt-1 text-sm text-slate-500">برای پروفایل‌های عمومی و فعال منتور، حساب ورود مستقل ایجاد و دسترسی را مدیریت کن.</p></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}
      <form onSubmit={create} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <div className="md:col-span-2"><h2 className="font-black text-slate-900">ساخت حساب جدید</h2><p className="mt-1 text-xs text-slate-500">حساب به شناسه پروفایل منتور متصل می‌شود و از ورود مدیر و دانش‌آموز جداست.</p></div>
        <label className="grid gap-1 text-xs font-bold text-slate-600">پروفایل منتور
          <select value={profileId} onChange={(event) => selectProfile(event.target.value)} required className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm">
            <option value="">انتخاب پروفایل فعال</option>
            {available.map((person) => <option key={person.id} value={person.id}>#{person.id} · {person.first_name} {person.last_name} · {person.field === "physics" ? "فیزیک" : "کامپیوتر"}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">نام نمایشی حساب
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={180} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">شماره همراه ورود
          <input value={phone} onChange={(event) => setPhone(event.target.value)} required inputMode="tel" className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" placeholder="0912..." />
        </label>
        <label className="grid gap-1 text-xs font-bold text-slate-600">رمز عبور اولیه
          <input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={10} maxLength={72} type="password" className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" />
        </label>
        <div className="md:col-span-2"><button type="submit" disabled={busy || !profileId || password.length < 10} className="rounded-lg bg-blue-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "در حال ساخت..." : "ایجاد حساب مشاور"}</button></div>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black text-slate-900">حساب‌های موجود</h2><p className="mt-1 text-xs text-slate-500">{accounts.length} حساب ثبت‌شده</p></div>
        {loading ? <p className="p-8 text-center text-xs text-slate-400">در حال بارگذاری...</p> : accounts.length ? <div className="divide-y divide-slate-100">
          {accounts.map((account) => <article key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div><strong className="block text-sm text-slate-800">{account.display_name}</strong><small className="text-xs text-slate-400">پروفایل #{account.mentor_profile_id} · {account.phone}</small></div>
            <div className="flex items-center gap-3"><span className={"rounded-full px-3 py-1 text-[10px] font-bold " + (account.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{account.is_active ? "فعال" : "غیرفعال"}</span><button type="button" onClick={() => toggle(account)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">{account.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"}</button></div>
          </article>)}
        </div> : <p className="p-8 text-center text-xs text-slate-400">هنوز حسابی ایجاد نشده است.</p>}
      </section>
    </div>
  );
}
