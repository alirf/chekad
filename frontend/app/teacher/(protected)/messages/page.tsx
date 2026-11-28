"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeacherAuthError } from "../../../../lib/teacher-auth";
import {
  fetchTeacherThreads,
  fetchTeacherThreadMessages,
  openTeacherMessageSocket,
  sendTeacherMessage,
  TeacherPortalError,
  type TeacherThread,
} from "../../../../lib/teacher-portal";
import type { PortalMessage } from "../../../../lib/student-auth";
import { MessageCenter } from "../../../../components/message-center";

export default function TeacherMessagesPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<TeacherThread[]>([]);
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
    const result = await fetchTeacherThreads();
    setThreads(result.items);
    setSelectedId((current) => current && result.items.some((thread) => thread.id === current) ? current : (result.items[0]?.id ?? null));
  }

  useEffect(() => {
    let active = true;
    fetchTeacherThreads()
      .then((result) => {
        if (active) {
          setThreads(result.items);
          setSelectedId(result.items[0]?.id ?? null);
        }
      })
      .catch((cause) => {
        if (!active) return;
        if ((cause instanceof TeacherAuthError || cause instanceof TeacherPortalError) && cause.status === 401) router.replace("/teacher/login");
        else setError(cause instanceof Error ? cause.message : "دریافت گفتگوها انجام نشد.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    let socket: WebSocket | null = null;
    let retry: number | null = null;
    let fallback: number | null = null;

    const refresh = () => {
      void fetchTeacherThreadMessages(selectedId)
        .then((result) => {
          if (active) {
            setMessages(result.items);
            setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unread_count: 0 } : thread));
          }
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : "دریافت پیام‌ها انجام نشد.");
        });
    };
    const startFallback = () => { if (!fallback && active) fallback = window.setInterval(refresh, 12000); };
    const stopFallback = () => { if (fallback) window.clearInterval(fallback); fallback = null; };
    const connect = () => {
      if (!active) return;
      try {
        socket = openTeacherMessageSocket(selectedId, (message) => {
          if (active) {
            setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
            setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, last_message_at: message.created_at } : thread));
          }
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
      await sendTeacherMessage(selected.id, draft.trim());
      setDraft("");
      const result = await fetchTeacherThreadMessages(selected.id);
      setMessages(result.items);
      await loadThreads();
      setNotice("پاسخ برای دانش‌آموز ارسال شد.");
    } catch (cause) {
      if ((cause instanceof TeacherAuthError || cause instanceof TeacherPortalError) && cause.status === 401) router.replace("/teacher/login");
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
      eyebrow="TEACHER MESSENGER"
      title="پیام‌های دانش‌آموزان"
      description="گفت‌وگوهای مربوط به کلاس‌های خصوصی تخصیص‌یافته به تو را از اینجا مدیریت کن."
      threads={threads.map((thread) => ({
        id: thread.id,
        title: thread.student_name,
        subtitle: "دانش‌آموز کلاس خصوصی",
        meta: (thread.field === "physics" ? "المپیاد فیزیک" : "المپیاد کامپیوتر") + " · " + thread.topic,
        category: thread.field,
        avatarLabel: thread.student_name.slice(0, 1),
        unreadCount: thread.unread_count,
        lastActivity: thread.last_message_at,
        status: thread.status,
      }))}
      messages={messages}
      selectedThreadId={selectedId}
      currentUserType="teacher"
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
      senderLabels={{ student: "دانش‌آموز", admin: "پشتیبانی چکاد", mentor: "منتور اختصاصی" }}
      emptyThreadsTitle="هنوز گفت‌وگویی برای تو ثبت نشده"
      emptyThreadsDescription="با تخصیص یک کلاس خصوصی، مکالمه با دانش‌آموز در اینجا نمایش داده می‌شود."
      emptyMessagesTitle="گفت‌وگو را آغاز کن"
      emptyMessagesDescription="پرسش‌ها و نکات مربوط به کلاس را اینجا با دانش‌آموز در میان بگذار."
      composerPlaceholder="پاسخ خود را برای دانش‌آموز بنویس..."
      pageActions={
        <Link href="/teacher/weekly-plan" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-slate-400">
          مدیریت برنامه شاگردان
        </Link>
      }
    />
  );
}
