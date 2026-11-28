"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { openPortalMessageSocket, type PortalMessage } from "../../../../lib/student-auth";
import { MessageCenter } from "../../../../components/message-center";

type Thread = {
  id: number;
  student_auth_id: number;
  student_name: string;
  subject: string;
  channel: "support" | "advisor" | "teacher";
  status: "open" | "closed";
  last_message_at: string;
  unread_count: number;
};
async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "درخواست انجام نشد.");
  return data as T;
}
const api = (path: string, init?: RequestInit) => fetch("/api/application" + path, {
  ...init,
  credentials: "same-origin",
  cache: "no-store",
  headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
});

export default function AdminMessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [live, setLive] = useState(false);

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);

  const loadThreads = useCallback(async () => {
    const params = new URLSearchParams({ status: filter });
    const result = await json<{ items: Thread[]; total: number }>(await api("/admin/messages/threads?" + params.toString()));
    setThreads(result.items);
    setSelectedId((current) => current && result.items.some((thread) => thread.id === current) ? current : (result.items[0]?.id ?? null));
  }, [filter]);

  const loadMessages = useCallback(async (id: number) => {
    const result = await json<{ items: PortalMessage[]; total: number }>(await api("/admin/messages/threads/" + id + "/messages"));
    setMessages(result.items);
    setThreads((current) => current.map((thread) => thread.id === id ? { ...thread, unread_count: 0 } : thread));
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ status: filter });
    api("/admin/messages/threads?" + params.toString())
      .then(json<{ items: Thread[]; total: number }>)
      .then((result) => {
        if (active) {
          setThreads(result.items);
          setSelectedId(result.items[0]?.id ?? null);
        }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت گفتگوها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter]);

  useEffect(() => {
    if (selectedId === null) {
      setMessages([]);
      return;
    }
    let active = true;
    let socket: WebSocket | null = null;
    let retry: number | null = null;
    let fallback: number | null = null;

    const refresh = () => {
      void api("/admin/messages/threads/" + selectedId + "/messages")
        .then(json<{ items: PortalMessage[]; total: number }>)
        .then((result) => {
          if (active) {
            setMessages(result.items);
            setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unread_count: 0 } : thread));
          }
        })
        .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت پیام‌ها انجام نشد."); });
    };
    const startFallback = () => { if (!fallback && active) fallback = window.setInterval(refresh, 12000); };
    const stopFallback = () => { if (fallback) window.clearInterval(fallback); fallback = null; };
    const connect = () => {
      if (!active) return;
      try {
        socket = openPortalMessageSocket("admin", selectedId, (message) => {
          if (!active) return;
          setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
          setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, last_message_at: message.created_at } : thread));
        }, () => {
          if (active) { setLive(true); stopFallback(); }
        }, () => {
          if (active) { setLive(false); startFallback(); retry = window.setTimeout(connect, 2500); }
        });
      } catch {
        setLive(false);
        startFallback();
      }
    };
    refresh();
    connect();
    return () => {
      active = false;
      setLive(false);
      stopFallback();
      if (retry) window.clearTimeout(retry);
      socket?.close();
    };
  }, [selectedId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      await json(await api("/admin/messages/threads/" + selected.id + "/messages", {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      }));
      setDraft("");
      await loadMessages(selected.id);
      await loadThreads();
      setNotice("پاسخ ارسال شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ارسال پاسخ انجام نشد.");
    } finally {
      setSending(false);
    }
  }

  async function setStatus(next: "open" | "closed") {
    if (!selected) return;
    setError("");
    setNotice("");
    try {
      await json(await api("/admin/messages/threads/" + selected.id + "?status_value=" + next, { method: "PATCH" }));
      await loadThreads();
      setNotice(next === "closed" ? "گفتگو بسته شد." : "گفتگو دوباره باز شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تغییر وضعیت انجام نشد.");
    }
  }

  const channelTitle = selected?.channel === "advisor" ? "منتورینگ" : selected?.channel === "teacher" ? "کلاس خصوصی" : "پشتیبانی";
  const filters = [
    { id: "all", label: "همه" },
    { id: "unread", label: "خوانده‌نشده" },
    { id: "support", label: "پشتیبانی" },
    { id: "advisor", label: "منتورینگ" },
    { id: "teacher", label: "کلاس خصوصی" },
  ];

  return (
    <MessageCenter
      eyebrow="CHEKAD SUPPORT DESK"
      title="مرکز پیام‌های دانش‌آموزان"
      description="گفت‌وگوهای پشتیبانی، منتورینگ و کلاس خصوصی را از یک فضای واحد پیگیری کن."
      threads={threads.map((thread) => ({
        id: thread.id,
        title: thread.student_name,
        subtitle: thread.channel === "advisor" ? "منتورینگ" : thread.channel === "teacher" ? "کلاس خصوصی" : "پشتیبانی",
        meta: thread.subject,
        category: thread.channel,
        avatarLabel: thread.student_name.slice(0, 1),
        unreadCount: thread.unread_count,
        lastActivity: thread.last_message_at,
        status: thread.status,
      }))}
      messages={messages}
      selectedThreadId={selectedId}
      currentUserType="admin"
      draft={draft}
      onDraftChange={setDraft}
      onSubmit={send}
      onSelectThread={setSelectedId}
      loadingThreads={loading}
      sending={sending}
      live={live}
      isConversationOpen={selected?.status === "open"}
      error={error}
      notice={notice}
      filters={filters}
      senderLabels={{ student: "دانش‌آموز", mentor: "منتور اختصاصی", teacher: "مدرس خصوصی", admin: "ادمین چکاد" }}
      emptyThreadsTitle="گفت‌وگویی در این بخش وجود ندارد"
      emptyThreadsDescription="پیام‌های ثبت‌شده از سوی دانش‌آموزان پس از ایجاد، در اینجا قرار می‌گیرند."
      emptyMessagesTitle="گفتگو آماده بررسی است"
      emptyMessagesDescription="پیام‌های این گفتگو در این قسمت نمایش داده می‌شوند."
      composerPlaceholder="پاسخ خود را برای دانش‌آموز بنویس..."
      pageActions={
        <div className="flex gap-2">
          <button type="button" onClick={() => setFilter("open")} className={"rounded-xl border px-3 py-2 text-[10px] font-bold transition " + (filter === "open" ? "border-[#173b59] bg-[#173b59] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400")}>گفتگوهای باز</button>
          <button type="button" onClick={() => setFilter("closed")} className={"rounded-xl border px-3 py-2 text-[10px] font-bold transition " + (filter === "closed" ? "border-[#173b59] bg-[#173b59] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400")}>بسته‌شده</button>
        </div>
      }
      chatActions={
        selected ? (
          <button
            type="button"
            onClick={() => setStatus(selected.status === "open" ? "closed" : "open")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[9px] font-bold text-slate-600 transition hover:border-slate-400"
          >
            {selected.status === "open" ? "بستن گفتگو" : "بازکردن گفتگو"}
          </button>
        ) : null
      }
    />
  );
}
