"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Thread = {
  id: number;
  student_auth_id: number;
  student_name: string;
  subject: string;
  channel: "support" | "advisor";
  status: "open" | "closed";
  last_message_at: string;
  unread_count: number;
};
type Message = {
  id: number;
  sender_type: "student" | "admin" | "mentor";
  sender_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "درخواست انجام نشد.");
  return data;
}
function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);

  const loadThreads = useCallback(async () => {
    const params = new URLSearchParams({ status: filter });
    const data = await readJson(await fetch("/api/application/admin/messages/threads?" + params.toString(), { credentials: "same-origin", cache: "no-store" }));
    setThreads(data.items);
    setSelectedId((current) => current && data.items.some((item: Thread) => item.id === current) ? current : (data.items[0]?.id ?? null));
  }, [filter]);

  const loadMessages = useCallback(async (id: number) => {
    const data = await readJson(await fetch("/api/application/admin/messages/threads/" + id + "/messages", { credentials: "same-origin", cache: "no-store" }));
    setMessages(data.items);
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ status: filter });
    fetch("/api/application/admin/messages/threads?" + params.toString(), { credentials: "same-origin", cache: "no-store" })
      .then(readJson)
      .then((data) => {
        if (!active) return;
        setThreads(data.items);
        setSelectedId(data.items[0]?.id ?? null);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت پیام‌ها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    const refresh = async () => {
      try {
        const data = await readJson(await fetch("/api/application/admin/messages/threads/" + selectedId + "/messages", { credentials: "same-origin", cache: "no-store" }));
        if (active) {
          setMessages(data.items);
          setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unread_count: 0 } : thread));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "دریافت محتوای گفت‌وگو انجام نشد.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selectedId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true); setError(""); setNotice("");
    try {
      await readJson(await fetch("/api/application/admin/messages/threads/" + selected.id + "/messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      }));
      setDraft("");
      await loadMessages(selected.id);
      await loadThreads();
      setNotice("پاسخ ارسال شد.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ارسال پاسخ انجام نشد."); }
    finally { setSending(false); }
  }

  async function updateStatus(next: "open" | "closed") {
    if (!selected) return;
    setError(""); setNotice("");
    try {
      await readJson(await fetch("/api/application/admin/messages/threads/" + selected.id + "?status_value=" + next, {
        method: "PATCH",
        credentials: "same-origin",
      }));
      setNotice(next === "closed" ? "گفت‌وگو بسته شد." : "گفت‌وگو باز شد.");
      await loadThreads();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تغییر وضعیت انجام نشد."); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold tracking-widest text-blue-600">STUDENT SUPPORT</p><h1 className="mt-1 text-2xl font-black text-slate-900">پیام‌های دانش‌آموزان</h1><p className="mt-1 text-sm text-slate-500">گفت‌وگوهای پشتیبانی دانش‌آموزان را از اینجا مدیریت کن.</p></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFilter("open")} className={"rounded-lg border px-3 py-2 text-xs font-bold " + (filter === "open" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600")}>باز</button>
          <button type="button" onClick={() => setFilter("closed")} className={"rounded-lg border px-3 py-2 text-xs font-bold " + (filter === "closed" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600")}>بسته‌شده</button>
        </div>
      </div>
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-l">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><strong className="text-sm text-slate-800">فهرست گفت‌وگوها</strong><span className="text-xs text-slate-400">{threads.length} گفت‌وگو</span></div>
          <div className="max-h-[520px] overflow-y-auto p-2">
            {loading ? <p className="p-5 text-center text-xs text-slate-400">در حال بارگذاری...</p> : threads.map((thread) => (
              <button key={thread.id} type="button" onClick={() => setSelectedId(thread.id)} className={"flex w-full items-center gap-3 rounded-xl p-3 text-right transition " + (selectedId === thread.id ? "bg-blue-50" : "hover:bg-slate-50")}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 font-black text-blue-700">{thread.student_name.slice(0, 1)}</span>
                <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800">{thread.student_name}</strong><small className="mt-1 block truncate text-[10px] text-slate-400">{thread.channel === "advisor" ? "مشاور اختصاصی · " : "پشتیبانی · "}{thread.subject}</small><small className="block text-[9px] text-slate-400">{dateTime(thread.last_message_at)}</small></span>
                {thread.unread_count > 0 && <b className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] text-white">{thread.unread_count}</b>}
              </button>
            ))}
            {!loading && !threads.length && <p className="p-6 text-center text-xs leading-7 text-slate-400">در این فیلتر گفت‌وگویی وجود ندارد.</p>}
          </div>
        </aside>
        <section className="flex min-w-0 flex-col bg-slate-50">
          {selected ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                <div><strong className="text-sm text-slate-800">{selected.student_name}</strong><p className="mt-1 text-[10px] text-slate-400">شناسه حساب دانش‌آموزی: {selected.student_auth_id} · {selected.channel === "advisor" ? "گفت‌وگو با مشاور" : "پشتیبانی"} · {selected.subject}</p></div>
                <button type="button" onClick={() => updateStatus(selected.status === "open" ? "closed" : "open")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50">{selected.status === "open" ? "بستن گفت‌وگو" : "بازکردن گفت‌وگو"}</button>
              </header>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
                {messages.map((message) => <article key={message.id} className={"max-w-[82%] rounded-xl border px-4 py-3 shadow-sm " + (message.sender_type === "admin" ? "mr-auto border-blue-100 bg-blue-50" : message.sender_type === "mentor" ? "mr-auto border-emerald-100 bg-emerald-50" : "ml-auto border-slate-200 bg-white")}>
                  {message.sender_type !== "student" && <small className="mb-1 block text-[9px] font-bold text-slate-500">{message.sender_type === "mentor" ? "منتور اختصاصی" : "ادمین چکاد"}</small>}
                  <p className="whitespace-pre-wrap break-words text-xs leading-7 text-slate-700">{message.body}</p>
                  <time className="mt-2 block text-left text-[9px] text-slate-400">{dateTime(message.created_at)}</time>
                </article>)}
                {!messages.length && <p className="m-auto text-xs text-slate-400">هنوز پیامی در این گفت‌وگو وجود ندارد.</p>}
              </div>
              {selected.status === "open" ? <form onSubmit={send} className="flex items-end gap-3 border-t border-slate-200 bg-white p-3">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={4000} placeholder="پاسخ خود را بنویس..." className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-400" />
                <button type="submit" disabled={sending || !draft.trim()} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{sending ? "..." : "ارسال پاسخ"}</button>
              </form> : <div className="border-t border-slate-200 bg-white p-4 text-center text-xs text-slate-400">این گفت‌وگو بسته شده است.</div>}
            </>
          ) : <div className="m-auto p-6 text-center text-xs text-slate-400">برای مشاهده پیام‌ها یک گفت‌وگو انتخاب کن.</div>}
        </section>
      </div>
    </div>
  );
}
