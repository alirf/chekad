"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  checkStudentAdvisorAvailability,
  checkStudentTeacherAvailability,
  createStudentAdvisorThread,
  createStudentMessageThread,
  createStudentTeacherThread,
  fetchStudentMessageThreads,
  fetchStudentThreadMessages,
  openPortalMessageSocket,
  sendStudentMessage,
  type PortalMessage,
  type PortalMessageThread,
} from "../../../lib/student-auth";
import { MessageCenter } from "../../../components/message-center";

export default function StudentMessagesPage() {
  const [threads, setThreads] = useState<PortalMessageThread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [subject, setSubject] = useState("گفت‌وگو با پشتیبانی چکاد");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [advisor, setAdvisor] = useState<{ available: boolean; name: string }>({ available: false, name: "منتور اختصاصی" });
  const [teacher, setTeacher] = useState<{ available: boolean; name: string }>({ available: false, name: "مدرس کلاس خصوصی" });
  const [checking, setChecking] = useState(true);
  const [live, setLive] = useState(false);

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);

  const loadThreads = useCallback(async () => {
    const result = await fetchStudentMessageThreads();
    setThreads(result.items);
    setSelectedId((current) => current && result.items.some((thread) => thread.id === current) ? current : (result.items[0]?.id ?? null));
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    const result = await fetchStudentThreadMessages(id);
    setMessages(result.items);
    setThreads((current) => current.map((thread) => thread.id === id ? { ...thread, unread_count: 0 } : thread));
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      checkStudentAdvisorAvailability().catch(() => ({ available: false, assignment: null })),
      checkStudentTeacherAvailability().catch(() => ({ available: false, assignment: null })),
      fetchStudentMessageThreads(),
    ]).then(([advisorResult, teacherResult, threadResult]) => {
      if (!active) return;
      setAdvisor({ available: advisorResult.available, name: advisorResult.assignment?.mentor_name || "منتور اختصاصی" });
      setTeacher({ available: teacherResult.available, name: teacherResult.assignment?.teacher_name || "مدرس کلاس خصوصی" });
      setThreads(threadResult.items);
      setSelectedId(threadResult.items[0]?.id ?? null);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "دریافت گفتگوها انجام نشد.");
    }).finally(() => {
      if (active) { setLoading(false); setChecking(false); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    let socket: WebSocket | null = null;
    let reconnect: number | null = null;
    let fallback: number | null = null;

    const refresh = () => {
      void fetchStudentThreadMessages(selectedId).then((result) => {
        if (!active) return;
        setMessages(result.items);
        setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unread_count: 0 } : thread));
      }).catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "دریافت پیام‌ها انجام نشد.");
      });
    };
    const startFallback = () => {
      if (!fallback && active) fallback = window.setInterval(refresh, 12000);
    };
    const stopFallback = () => {
      if (fallback) window.clearInterval(fallback);
      fallback = null;
    };
    const connect = () => {
      if (!active) return;
      try {
        socket = openPortalMessageSocket("student", selectedId, (message) => {
          if (!active) return;
          setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
          setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, last_message_at: message.created_at } : thread));
        }, () => {
          if (!active) return;
          setLive(true);
          stopFallback();
        }, () => {
          if (!active) return;
          setLive(false);
          startFallback();
          reconnect = window.setTimeout(connect, 2500);
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
      if (reconnect) window.clearTimeout(reconnect);
      socket?.close();
    };
  }, [selectedId]);

  async function createThread(kind: "support" | "advisor" | "teacher") {
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const thread = kind === "support"
        ? await createStudentMessageThread(subject)
        : kind === "advisor"
          ? await createStudentAdvisorThread()
          : await createStudentTeacherThread();
      await loadThreads();
      setSelectedId(thread.id);
      setNotice(kind === "support" ? "گفت‌وگو با پشتیبانی آماده است." : kind === "advisor" ? "گفت‌وگو با منتور آماده است." : "گفت‌وگو با مدرس آماده است.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ساخت گفتگو انجام نشد.");
    } finally {
      setCreating(false);
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    setError("");
    setNotice("");
    try {
      await sendStudentMessage(selected.id, draft.trim());
      setDraft("");
      await loadMessages(selected.id);
      await loadThreads();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ارسال پیام انجام نشد.");
    } finally {
      setSending(false);
    }
  }

  const filters = [
    { id: "all", label: "همه" },
    { id: "unread", label: "خوانده‌نشده" },
    { id: "advisor", label: "منتورینگ" },
    { id: "teacher", label: "کلاس خصوصی" },
    { id: "support", label: "پشتیبانی" },
  ];

  return (
    <MessageCenter
      eyebrow="CHEKAD MESSENGER"
      title="پیام‌رسان چکاد"
      description="ارتباط مستقیم و متمرکز با منتور، مدرس کلاس خصوصی و تیم پشتیبانی."
      threads={threads.map((thread) => ({
        id: thread.id,
        title: thread.subject,
        subtitle: thread.channel === "advisor" ? "گفت‌وگو با منتور اختصاصی" : thread.channel === "teacher" ? "گفت‌وگو درباره کلاس خصوصی" : "پشتیبانی چکاد",
        category: thread.channel,
        avatarLabel: thread.channel === "advisor" ? "م" : thread.channel === "teacher" ? "د" : "چ",
        unreadCount: thread.unread_count || 0,
        lastActivity: thread.last_message_at,
        status: thread.status,
      }))}
      messages={messages}
      selectedThreadId={selectedId}
      currentUserType="student"
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
      senderLabels={{ admin: "پشتیبانی چکاد", mentor: "منتور اختصاصی", teacher: "مدرس خصوصی" }}
      emptyThreadsTitle="هنوز گفت‌وگویی شروع نکرده‌ای"
      emptyThreadsDescription="از پایین این فهرست، با پشتیبانی یا یکی از همراهان آموزشی خود گفتگو را آغاز کن."
      emptyMessagesTitle="این گفتگو آماده است"
      emptyMessagesDescription="پیامت را بنویس تا ارتباط با همراه آموزشی‌ات شروع شود."
      composerPlaceholder="پیام خود را بنویس..."
      sidebarFooter={
        <div className="grid gap-2">
          <strong className="mb-1 text-[11px] font-black text-slate-700">شروع گفت‌وگوی تازه</strong>
          <label htmlFor="support-subject" className="text-[9px] font-bold text-slate-500">موضوع پیام به پشتیبانی</label>
          <input
            id="support-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={140}
            className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[10px] text-slate-700 outline-none transition focus:border-slate-400"
          />
          <button type="button" className="w-full rounded-xl bg-[#173b59] px-3 py-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#234f70] disabled:cursor-not-allowed disabled:opacity-50" onClick={() => createThread("support")} disabled={creating || subject.trim().length < 3}>
            {creating ? "در حال آماده‌سازی..." : "پیام به پشتیبانی"}
          </button>
          <button type="button" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right text-[10px] font-bold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-45" onClick={() => createThread("advisor")} disabled={creating || checking || !advisor.available}>
            {checking ? "بررسی منتور..." : advisor.available ? "پیام به " + advisor.name : "پس از تخصیص منتور فعال می‌شود"}
          </button>
          <button type="button" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right text-[10px] font-bold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-45" onClick={() => createThread("teacher")} disabled={creating || checking || !teacher.available}>
            {checking ? "بررسی مدرس..." : teacher.available ? "پیام به " + teacher.name : "پس از تخصیص کلاس خصوصی فعال می‌شود"}
          </button>
        </div>
      }
    />
  );
}
