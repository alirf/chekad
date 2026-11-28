"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MentorAuthError } from "../../../../lib/mentor-auth";

type Thread = {
  id: number;
  channel: "advisor";
  subject: string;
  student_name: string;
  status: "open" | "closed";
  last_message_at: string;
  unread_count: number;
  field: "physics" | "computer";
};
type Message = {
  id: number;
  sender_type: "student" | "mentor" | "admin";
  sender_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "";
    if (response.status === 401) throw new MentorAuthError(detail || "نشست مشاور منقضی شده است.", 401);
    throw new Error(detail || "درخواست انجام نشد.");
  }
  return data as T;
}
function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function MentorMessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);

  const loadThreads = useCallback(async () => {
    const result = await readJson<{ items: Thread[]; total: number }>(await fetch("/api/application/mentor/messages/threads", { credentials: "same-origin", cache: "no-store" }));
    setThreads(result.items);
    setSelectedId((current) => current && result.items.some((item) => item.id === current) ? current : (result.items[0]?.id ?? null));
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/application/mentor/messages/threads", { credentials: "same-origin", cache: "no-store" })
      .then(readJson<{ items: Thread[]; total: number }>)
      .then((result) => {
        if (!active) return;
        setThreads(result.items);
        setSelectedId(result.items[0]?.id ?? null);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof MentorAuthError && cause.status === 401) router.replace("/mentor/login");
        else setError(cause instanceof Error ? cause.message : "دریافت گفت‌وگوها انجام نشد.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await readJson<{ items: Message[]; total: number }>(await fetch("/api/application/mentor/messages/threads/" + selectedId + "/messages", { credentials: "same-origin", cache: "no-store" }));
        if (active) {
          setMessages(result.items);
          setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unread_count: 0 } : thread));
        }
      } catch (cause) {
        if (!active) return;
        if (cause instanceof MentorAuthError && cause.status === 401) router.replace("/mentor/login");
        else setError(cause instanceof Error ? cause.message : "دریافت پیام‌ها انجام نشد.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selectedId, router]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true); setError(""); setNotice("");
    try {
      await readJson<Message>(await fetch("/api/application/mentor/messages/threads/" + selected.id + "/messages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      }));
      setDraft("");
      const result = await readJson<{ items: Message[]; total: number }>(await fetch("/api/application/mentor/messages/threads/" + selected.id + "/messages", { credentials: "same-origin", cache: "no-store" }));
      setMessages(result.items);
      await loadThreads();
      setNotice("پاسخ برای دانش‌آموز ارسال شد.");
    } catch (cause) {
      if (cause instanceof MentorAuthError && cause.status === 401) router.replace("/mentor/login");
      else setError(cause instanceof Error ? cause.message : "ارسال پیام انجام نشد.");
    } finally { setSending(false); }
  }

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-bold tracking-widest text-blue-600">MENTOR MESSENGER</p><h1 className="mt-1 text-2xl font-black text-slate-900">گفت‌وگو با دانش‌آموزان</h1><p className="mt-1 text-sm text-slate-500">فقط مکالمات دانش‌آموزانی را می‌بینی که به پروفایل منتور تو تخصیص داده شده‌اند.</p></div>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}
      <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-l">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><strong className="text-sm text-slate-800">دانش‌آموزان من</strong><span className="text-xs text-slate-400">{threads.length} گفت‌وگو</span></div>
          <div className="max-h-[570px] overflow-y-auto p-2">
            {threads.map((thread) => <button key={thread.id} type="button" onClick={() => setSelectedId(thread.id)} className={"flex w-full items-center gap-3 rounded-xl p-3 text-right transition " + (selectedId === thread.id ? "bg-blue-50" : "hover:bg-slate-50")}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 font-black text-blue-700">{thread.student_name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-slate-800">{thread.student_name}</strong><small className="mt-1 block text-[10px] text-slate-400">{thread.subject}</small><small className="block text-[9px] text-slate-400">{dateTime(thread.last_message_at)}</small></span>
              {thread.unread_count > 0 && <b className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[9px] text-white">{thread.unread_count}</b>}
            </button>)}
            {!loading && !threads.length && <p className="p-6 text-center text-xs leading-7 text-slate-400">هنوز گفت‌وگویی از طرف دانش‌آموزان شروع نشده است.</p>}
            {loading && <p className="p-6 text-center text-xs text-slate-400">در حال بارگذاری...</p>}
          </div>
        </aside>
        <section className="flex min-w-0 flex-col bg-slate-50">
          {selected ? <>
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><strong className="text-sm text-slate-800">{selected.student_name}</strong><p className="mt-1 text-[10px] text-slate-400">{selected.field === "physics" ? "المپیاد فیزیک" : "المپیاد کامپیوتر"} · {selected.subject}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{selected.status === "open" ? "فعال" : "بسته"}</span></header>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
              {messages.map((message) => <article key={message.id} className={"max-w-[82%] rounded-xl border px-4 py-3 shadow-sm " + (message.sender_type === "mentor" ? "mr-auto border-blue-100 bg-blue-50" : "ml-auto border-slate-200 bg-white")}><p className="whitespace-pre-wrap break-words text-xs leading-7 text-slate-700">{message.body}</p><time className="mt-2 block text-left text-[9px] text-slate-400">{dateTime(message.created_at)}{message.sender_type === "mentor" && message.read_at ? " · دیده‌شده" : ""}</time></article>)}
              {!messages.length && <p className="m-auto text-xs text-slate-400">هنوز پیامی در این گفت‌وگو وجود ندارد.</p>}
            </div>
            {selected.status === "open" ? <form onSubmit={send} className="flex items-end gap-3 border-t border-slate-200 bg-white p-3"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={4000} placeholder="پاسخ خود را بنویس..." className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-400" /><button type="submit" disabled={sending || !draft.trim()} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{sending ? "..." : "ارسال پاسخ"}</button></form> : <div className="border-t border-slate-200 bg-white p-4 text-center text-xs text-slate-400">این گفت‌وگو بسته شده است.</div>}
          </> : <div className="m-auto p-6 text-center text-xs text-slate-400">برای مشاهده مکالمات، یک دانش‌آموز را انتخاب کن.</div>}
        </section>
      </div>
    </div>
  );
}
