"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MentorAuthError } from "../../../../lib/mentor-auth";
import { openPortalMessageSocket, type PortalMessage } from "../../../../lib/student-auth";
import { MessageCenter } from "../../../../components/message-center";

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
async function json<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.detail === "string" ? data.detail : "درخواست انجام نشد.";
    if (response.status === 401) throw new MentorAuthError(message, 401);
    throw new Error(message);
  }
  return data as T;
}
const api = (path: string, init?: RequestInit) => fetch("/api/application" + path, {
  ...init,
  credentials: "same-origin",
  cache: "no-store",
  headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
});

export default function MentorMessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [live, setLive] = useState(false);

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);

  async function loadThreads() {
    const result = await json<{ items: Thread[]; total: number }>(await api("/mentor/messages/threads"));
    setThreads(result.items);
    setSelectedId((current) => current && result.items.some((thread) => thread.id === current) ? current : (result.items[0]?.id ?? null));
  }

  useEffect(() => {
    let active = true;
    api("/mentor/messages/threads")
      .then(json<{ items: Thread[]; total: number }>)
      .then((result) => {
        if (active) {
          setThreads(result.items);
          setSelectedId(result.items[0]?.id ?? null);
        }
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof MentorAuthError && cause.status === 401) router.replace("/mentor/login");
        else setError(cause instanceof Error ? cause.message : "دریافت گفتگوها انجام نشد.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

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
      void api("/mentor/messages/threads/" + selectedId + "/messages")
        .then(json<{ items: PortalMessage[]; total: number }>)
        .then((result) => {
          if (active) {
            setMessages(result.items);
            setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unread_count: 0 } : thread));
          }
        })
        .catch((cause) => {
          if (!active) return;
          if (cause instanceof MentorAuthError && cause.status === 401) router.replace("/mentor/login");
          else setError(cause instanceof Error ? cause.message : "دریافت پیام‌ها انجام نشد.");
        });
    };
    const startFallback = () => { if (!fallback && active) fallback = window.setInterval(refresh, 12000); };
    const stopFallback = () => { if (fallback) window.clearInterval(fallback); fallback = null; };
    const connect = () => {
      if (!active) return;
      try {
        socket = openPortalMessageSocket("mentor", selectedId, (message) => {
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
  }, [selectedId, router]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      const message = await json<PortalMessage>(await api("/mentor/messages/threads/" + selected.id + "/messages", {
        method: "POST",
        body: JSON.stringify({ body: draft.trim() }),
      }));
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setDraft("");
      await loadThreads();
      setNotice("پاسخ برای دانش‌آموز ارسال شد.");
    } catch (cause) {
      if (cause instanceof MentorAuthError && cause.status === 401) router.replace("/mentor/login");
      else setError(cause instanceof Error ? cause.message : "ارسال پیام انجام نشد.");
    } finally {
      setSending(false);
    }
  }

  const filters = [
    { id: "all", label: "همه شاگردان" },
    { id: "unread", label: "پیام‌های جدید" },
    { id: "physics", label: "فیزیک" },
    { id: "computer", label: "کامپیوتر" },
  ];

  return (
    <MessageCenter
      eyebrow="MENTOR MESSENGER"
      title="گفت‌وگو با دانش‌آموزان"
      description="فقط مکالمات شاگردانی را می‌بینی که به پروفایل منتور تو تخصیص داده شده‌اند."
      threads={threads.map((thread) => ({
        id: thread.id,
        title: thread.student_name,
        subtitle: "دانش‌آموز منتورینگ",
        meta: (thread.field === "physics" ? "المپیاد فیزیک" : "المپیاد کامپیوتر") + " · " + thread.subject,
        category: thread.field,
        avatarLabel: thread.student_name.slice(0, 1),
        unreadCount: thread.unread_count,
        lastActivity: thread.last_message_at,
        status: thread.status,
      }))}
      messages={messages}
      selectedThreadId={selectedId}
      currentUserType="mentor"
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
      senderLabels={{ student: "دانش‌آموز", admin: "پشتیبانی چکاد", teacher: "مدرس خصوصی" }}
      emptyThreadsTitle="هنوز شاگردی به تو تخصیص داده نشده"
      emptyThreadsDescription="پس از تخصیص دانش‌آموز، گفت‌وگوی او در این قسمت قرار می‌گیرد."
      emptyMessagesTitle="گفت‌وگو را آغاز کن"
      emptyMessagesDescription="می‌توانی برنامه، تمرین‌ها و نکات آموزشی را با شاگردت مرور کنی."
      composerPlaceholder="پاسخ خود را برای دانش‌آموز بنویس..."
      pageActions={
        <div className="flex flex-wrap gap-2">
          <Link href="/mentor" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-slate-400">خانه پنل</Link>
          <Link href="/mentor/weekly-plan" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-slate-400">برنامه هفتگی</Link>
          <Link href="/mentor/reports" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-slate-400">گزارش پیشرفت</Link>
        </div>
      }
    />
  );
}
