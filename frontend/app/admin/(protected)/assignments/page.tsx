"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Kind = "mentorship" | "tutoring";
type Application = { id: number; kind: Kind; status: string; field: "physics" | "computer"; tracking_code: string; selected_offer?: { person_id: number; person_name: string } | null; student: { first_name: string; last_name: string; grade: string } };
type Person = { id: number; first_name: string; last_name: string; field: "physics" | "computer"; status: string; is_public: boolean; current_load: number; capacity: number };
type Assignment = { id: number; kind: Kind; application_id: number; student_name: string; student_auth_id: number | null; field: "physics" | "computer"; person_id: number; person_name: string; start_date: string; end_date?: string | null; status: string };
type SessionDraft = { scheduled_at: string; duration_minutes: string };
async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "درخواست انجام نشد.");
  return data as T;
}
function today() { const date = new Date(); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function localDateTimeWithOffset(value: string) {
  const offsetMinutes = -new Date(value).getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return value + sign + hours + ":" + minutes;
}

export default function AdminAssignmentsPage() {
  const [kind, setKind] = useState<Kind>("mentorship");
  const [applications, setApplications] = useState<Application[]>([]);
  const [mentors, setMentors] = useState<Person[]>([]);
  const [tutors, setTutors] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [offerApplicationId, setOfferApplicationId] = useState("");
  const [offerPersonId, setOfferPersonId] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [offerTerms, setOfferTerms] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerExpiresAt, setOfferExpiresAt] = useState("");
  const [personId, setPersonId] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [sessions, setSessions] = useState<SessionDraft[]>([{ scheduled_at: "", duration_minutes: "20" }]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const people = kind === "mentorship" ? mentors : tutors;
  const filteredPeople = useMemo(() => people.filter((person) => {
    const activeLoad = assignments.filter((assignment) =>
      assignment.kind === kind && assignment.person_id === person.id && assignment.status === "active"
    ).length;
    return person.status === "active" && person.is_public && activeLoad < person.capacity;
  }), [people, assignments, kind]);
  const openApplications = useMemo(() => applications.filter((app) => app.kind === kind && app.status === "accepted"), [applications, kind]);
  const proposalApplications = useMemo(() => applications.filter((app) => app.kind === kind && ["new", "reviewing", "waiting_for_student", "options_proposed"].includes(app.status)), [applications, kind]);
  const selectedProposalApplication = proposalApplications.find((app) => app.id === Number(offerApplicationId));
  const proposalPeople = filteredPeople.filter((person) => !selectedProposalApplication || person.field === selectedProposalApplication.field);

  const load = useCallback(async () => {
    const [appData, mentorData, tutorData, assignmentData] = await Promise.all([
      json<{ items: Application[] }>(await fetch("/api/application/admin/applications?kind=all&limit=100", { credentials: "same-origin", cache: "no-store" })),
      json<Person[]>(await fetch("/api/people/admin/mentors", { credentials: "same-origin", cache: "no-store" })),
      json<Person[]>(await fetch("/api/people/admin/tutors", { credentials: "same-origin", cache: "no-store" })),
      json<{ items: Assignment[] }>(await fetch("/api/application/admin/assignments", { credentials: "same-origin", cache: "no-store" })),
    ]);
    setApplications(appData.items);
    setMentors(mentorData);
    setTutors(tutorData);
    setAssignments(assignmentData.items);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/application/admin/applications?kind=all&limit=100", { credentials: "same-origin", cache: "no-store" }).then(json<{ items: Application[] }>),
      fetch("/api/people/admin/mentors", { credentials: "same-origin", cache: "no-store" }).then(json<Person[]>),
      fetch("/api/people/admin/tutors", { credentials: "same-origin", cache: "no-store" }).then(json<Person[]>),
      fetch("/api/application/admin/assignments", { credentials: "same-origin", cache: "no-store" }).then(json<{ items: Assignment[] }>),
    ]).then(([apps, mentorRows, tutorRows, assignmentRows]) => {
      if (!active) return;
      setApplications(apps.items); setMentors(mentorRows); setTutors(tutorRows); setAssignments(assignmentRows.items);
    }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت اطلاعات تخصیص انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function addSession() {
    setSessions((current) => current.length >= 24 ? current : [...current, { scheduled_at: "", duration_minutes: "20" }]);
  }
  function updateSession(index: number, patch: Partial<SessionDraft>) {
    setSessions((current) => current.map((session, row) => row === index ? { ...session, ...patch } : session));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const normalizedSessions = sessions.filter((session) => session.scheduled_at).map((session) => ({
        scheduled_at: localDateTimeWithOffset(session.scheduled_at),
        duration_minutes: Number(session.duration_minutes),
      }));
      if (sessions.some((session) => !session.scheduled_at)) throw new Error("زمان تمام جلسه‌ها را وارد کن یا ردیف خالی را حذف کن.");
      await json(await fetch("/api/application/admin/assignments", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          application_id: Number(applicationId),
          person_id: Number(personId),
          start_date: startDate,
          end_date: endDate || null,
          sessions: normalizedSessions,
        }),
      }));
      setNotice("تخصیص با موفقیت ثبت شد و جلسه‌ها به تقویم دانش‌آموز اضافه شدند.");
      setApplicationId(""); setPersonId(""); setSessions([{ scheduled_at: "", duration_minutes: "20" }]);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت تخصیص انجام نشد."); }
    finally { setBusy(false); }
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offerApplicationId || !offerPersonId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await json(await fetch("/api/application/admin/applications/" + kind + "/" + offerApplicationId + "/offers", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_id: Number(offerPersonId), description: offerDescription, terms: offerTerms, price_toman: offerPrice.trim() ? Number(offerPrice) : null, expires_at: offerExpiresAt ? localDateTimeWithOffset(offerExpiresAt) : null }),
      }));
      setNotice("پیشنهاد برای دانش‌آموز ارسال شد. پس از انتخاب او، درخواست وارد مرحله تخصیص می‌شود.");
      setOfferPersonId(""); setOfferDescription(""); setOfferTerms(""); setOfferPrice(""); setOfferExpiresAt("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ثبت پیشنهاد انجام نشد."); }
    finally { setBusy(false); }
  }
  async function changeStatus(assignment: Assignment, nextStatus: "active" | "completed" | "cancelled") {
    setError(""); setNotice("");
    try {
      await json(await fetch("/api/application/admin/assignments/" + assignment.kind + "/" + assignment.id, {
        method: "PATCH", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }));
      setNotice("وضعیت تخصیص تغییر کرد.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر وضعیت انجام نشد."); }
  }

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold tracking-widest text-blue-600">SERVICE ASSIGNMENTS</p><h1 className="mt-1 text-2xl font-black text-slate-900">تخصیص منتور و مدرس</h1><p className="mt-1 text-sm text-slate-500">پس از آن‌که دانش‌آموز پیشنهادها را در پیام‌رسان بررسی و انتخابش را تأیید کرد، درخواست پذیرفته‌شده را به منتور یا مدرس متناسب وصل کن.</p></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}
      <form onSubmit={submitOffer} className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
        <div><h2 className="font-black text-slate-900">پیشنهاد منتور یا مدرس به دانش‌آموز</h2><p className="mt-1 text-xs text-slate-500">گزینه را همراه با توضیحات و شرایط ارسال کن. تا پیش از انتخاب صریح دانش‌آموز، امکان تخصیص وجود ندارد.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-slate-600">نوع درخواست<select value={kind} onChange={(event) => { setKind(event.target.value as Kind); setOfferApplicationId(""); setOfferPersonId(""); }} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="mentorship">منتورینگ</option><option value="tutoring">کلاس خصوصی</option></select></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">درخواست دانش‌آموز<select value={offerApplicationId} onChange={(event) => { setOfferApplicationId(event.target.value); setOfferPersonId(""); }} required className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">انتخاب درخواست</option>{proposalApplications.map((app) => <option key={app.id} value={app.id}>#{app.id} · {app.student.first_name} {app.student.last_name} · {app.field === "physics" ? "فیزیک" : "کامپیوتر"} · {app.tracking_code} · {app.selected_offer?.person_name || "انتخاب دستی قدیمی"}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2">{kind === "mentorship" ? "منتور پیشنهادی" : "مدرس پیشنهادی"}<select value={offerPersonId} onChange={(event) => setOfferPersonId(event.target.value)} required className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">انتخاب فرد فعال و دارای ظرفیت</option>{proposalPeople.map((person) => <option key={person.id} value={person.id}>#{person.id} · {person.first_name} {person.last_name} · ظرفیت {assignments.filter((a) => a.kind === kind && a.person_id === person.id && a.status === "active").length}/{person.capacity}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2">معرفی و توضیحات<textarea value={offerDescription} onChange={(event) => setOfferDescription(event.target.value)} required minLength={10} maxLength={1200} rows={3} className="rounded-lg border border-slate-200 bg-white p-3 text-sm" placeholder="تخصص، تجربه و دلیل تناسب این همراه با نیاز دانش‌آموز..." /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">هزینه (تومان، اختیاری)<input type="number" min="0" value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">مهلت انتخاب (اختیاری)<input type="datetime-local" value={offerExpiresAt} onChange={(event) => setOfferExpiresAt(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2">شرایط همکاری<textarea value={offerTerms} onChange={(event) => setOfferTerms(event.target.value)} required minLength={3} maxLength={1600} rows={3} className="rounded-lg border border-slate-200 bg-white p-3 text-sm" placeholder="مدت همکاری، تعداد جلسات، مدت هر جلسه و سایر شرایط..." /></label>
        </div>
        <button type="submit" disabled={busy || !offerApplicationId || !offerPersonId || !offerDescription.trim() || !offerTerms.trim()} className="justify-self-start rounded-lg bg-blue-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "در حال ثبت..." : "ارسال پیشنهاد برای دانش‌آموز"}</button>
      </form>
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="font-black text-slate-900">تخصیص جدید</h2><p className="mt-1 text-xs text-slate-500">با ثبت این فرم، وضعیت درخواست به «فعال» تغییر می‌کند و دانش‌آموز می‌تواند با منتور خود پیام بدهد.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold text-slate-600">نوع خدمت
            <select value={kind} onChange={(event) => { setKind(event.target.value as Kind); setApplicationId(""); setPersonId(""); }} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="mentorship">منتورینگ</option><option value="tutoring">کلاس خصوصی</option></select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">درخواست تأییدشده توسط دانش‌آموز
            <select value={applicationId} onChange={(event) => { setApplicationId(event.target.value); setPersonId(""); }} required className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="">انتخاب درخواست پذیرفته‌شده</option>{openApplications.map((app) => <option key={app.kind + app.id} value={app.id}>#{app.id} · {app.student.first_name} {app.student.last_name} · {app.field === "physics" ? "فیزیک" : "کامپیوتر"} · {app.tracking_code}</option>)}</select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600 md:col-span-2">{kind === "mentorship" ? "منتور" : "مدرس"}
            <select value={personId} onChange={(event) => setPersonId(event.target.value)} required className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm"><option value="">انتخاب فرد فعال و عمومی</option>{filteredPeople.filter((person) => {
              const selected = openApplications.find((app) => app.id === Number(applicationId));
              return !selected || (selected.selected_offer ? person.id === selected.selected_offer.person_id : person.field === selected.field);
            }).map((person) => <option key={person.id} value={person.id}>#{person.id} · {person.first_name} {person.last_name} · ظرفیت {assignments.filter((assignment) => assignment.kind === kind && assignment.person_id === person.id && assignment.status === "active").length}/{person.capacity}</option>)}</select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">تاریخ شروع<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">تاریخ پایان (اختیاری)<input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm" /></label>
        </div>
        <div className="grid gap-3">
          <div className="flex items-center justify-between"><strong className="text-sm text-slate-800">جلسات اولیه</strong><button type="button" onClick={addSession} disabled={sessions.length >= 24} className="text-xs font-bold text-blue-600 disabled:opacity-40">افزودن جلسه +</button></div>
          {sessions.map((session, index) => <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_150px_auto]">
            <label className="grid gap-1 text-[10px] font-bold text-slate-600">زمان جلسه<input type="datetime-local" value={session.scheduled_at} onChange={(event) => updateSession(index, { scheduled_at: event.target.value })} required className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" /></label>
            <label className="grid gap-1 text-[10px] font-bold text-slate-600">مدت (دقیقه)<input type="number" min="10" max="360" value={session.duration_minutes} onChange={(event) => updateSession(index, { duration_minutes: event.target.value })} required className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-xs" /></label>
            <button type="button" onClick={() => setSessions((current) => current.filter((_, row) => row !== index))} disabled={sessions.length <= 1} className="self-end rounded-lg border border-red-100 px-3 py-2 text-[10px] font-bold text-red-600 disabled:opacity-40">حذف</button>
          </div>)}
        </div>
        <button type="submit" disabled={busy || !applicationId || !personId || !sessions.length} className="justify-self-start rounded-lg bg-blue-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy ? "در حال ثبت..." : "ثبت تخصیص و زمان‌بندی جلسات"}</button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black text-slate-900">تخصیص‌های ثبت‌شده</h2><p className="mt-1 text-xs text-slate-500">{assignments.length} مورد</p></div>
        {loading ? <p className="p-8 text-center text-xs text-slate-400">در حال بارگذاری...</p> : assignments.length ? <div className="divide-y divide-slate-100">
          {assignments.map((item) => <article key={item.kind + item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div><strong className="block text-sm text-slate-800">{item.student_name} ← {item.person_name}</strong><small className="text-xs text-slate-400">{item.kind === "mentorship" ? "منتورینگ" : "کلاس خصوصی"} · {item.field === "physics" ? "فیزیک" : "کامپیوتر"} · درخواست #{item.application_id}</small><small className="block text-[10px] text-slate-400">{item.start_date}{item.end_date ? " تا " + item.end_date : ""}</small></div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] text-slate-600">{item.status === "active" ? "فعال" : item.status === "completed" ? "تکمیل‌شده" : "لغوشده"}</span>{item.status === "active" && <><button type="button" onClick={() => changeStatus(item, "completed")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">تکمیل</button><button type="button" onClick={() => changeStatus(item, "cancelled")} className="rounded-lg border border-red-100 px-3 py-2 text-[10px] font-bold text-red-600">لغو</button></>}</div>
          </article>)}
        </div> : <p className="p-8 text-center text-xs text-slate-400">هنوز تخصیصی ثبت نشده است.</p>}
      </section>
    </div>
  );
}
