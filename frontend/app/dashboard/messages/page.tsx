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
import { formatPortalDateTime, PortalEmptyState, PortalPageHeading } from "../../../components/student-portal-ui";

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
      if (active) setError(cause instanceof Error ? cause.message : "دریافت گفت‌وگوها انجام نشد.");
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
      setError(cause instanceof Error ? cause.message : "ساخت گفت‌وگو انجام نشد.");
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

  const channelTitle = selected?.channel === "advisor" ? "منتور اختصاصی" : selected?.channel === "teacher" ? "مدرس کلاس خصوصی" : "پشتیبانی چکاد";
  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="CHEKAD MESSENGER" title="پیام‌ها" description="گفت‌وگوی مستقیم با پشتیبانی، منتور اختصاصی و مدرس کلاس خصوصی؛ دریافت پیام‌ها در حالت عادی بلادرنگ است." />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}
      <div className="student-messenger-layout">
        <aside className="student-messenger-contacts">
          <div className="student-messenger-contact-heading"><strong>گفت‌وگوها</strong><span>{threads.length.toLocaleString("fa-IR")}</span></div>
          <div className="student-messenger-contact-list">
            {threads.map((thread) => (
              <button type="button" key={thread.id} className={"student-messenger-contact" + (selectedId === thread.id ? " is-active" : "")} onClick={() => setSelectedId(thread.id)}>
                <span className="student-messenger-contact-avatar">{thread.channel === "advisor" ? "م" : thread.channel === "teacher" ? "د" : "چ"}</span>
                <span className="student-messenger-contact-copy"><strong>{thread.subject}</strong><small>{formatPortalDateTime(thread.last_message_at)}</small></span>
                {(thread.unread_count || 0) > 0 && <b>{thread.unread_count}</b>}
              </button>
            ))}
            {!threads.length && !loading && <p className="student-messenger-no-threads">هنوز گفت‌وگویی شروع نشده است.</p>}
          </div>
          <div className="student-messenger-new">
            <label htmlFor="support-subject">موضوع گفت‌وگو با پشتیبانی</label>
            <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={140} />
            <button type="button" className="student-portal-button secondary full" onClick={() => createThread("support")} disabled={creating || subject.trim().length < 3}>{creating ? "در حال آماده‌سازی..." : "گفت‌وگو با پشتیبانی"}</button>
            <button type="button" className="student-portal-button secondary full" onClick={() => createThread("advisor")} disabled={creating || checking || !advisor.available}>{checking ? "بررسی منتور..." : advisor.available ? "پیام به " + advisor.name : "پس از تخصیص منتور فعال می‌شود"}</button>
            <button type="button" className="student-portal-button secondary full" onClick={() => createThread("teacher")} disabled={creating || checking || !teacher.available}>{checking ? "بررسی مدرس..." : teacher.available ? "پیام به " + teacher.name : "پس از تخصیص کلاس خصوصی فعال می‌شود"}</button>
          </div>
        </aside>
        <section className="student-messenger-chat">
          {selected ? <>
            <header className="student-messenger-chat-header">
              <div><strong>{selected.subject}</strong><small>{channelTitle} · {selected.status === "open" ? "گفت‌وگوی فعال" : "گفت‌وگوی بسته"}</small></div>
              <span className="student-messenger-online"><i /> {live ? "اتصال بلادرنگ" : "همگام‌سازی دوره‌ای"}</span>
            </header>
            <div className="student-messenger-messages">
              {messages.map((message) => (
                <article key={message.id} className={"student-message-row " + (message.sender_type === "student" ? "is-mine" : "is-other")}>
                  <div className={"student-message-bubble " + (message.sender_type === "student" ? "from-student" : message.sender_type === "mentor" ? "from-mentor" : message.sender_type === "teacher" ? "from-teacher" : "from-admin")}>
                    {message.sender_type !== "student" && <small className="student-message-sender">{message.sender_type === "mentor" ? "منتور اختصاصی" : message.sender_type === "teacher" ? "مدرس خصوصی" : "پشتیبانی چکاد"}</small>}
                    <p>{message.body}</p>
                    <time>{formatPortalDateTime(message.created_at)}</time>
                  </div>
                </article>
              ))}
              {!messages.length && <PortalEmptyState icon="✉" title="اولین پیام را ارسال کن" description="پیام‌ها در همین صفحه نگهداری و نمایش داده می‌شوند." />}
            </div>
            {selected.status === "open" ? (
              <form className="student-messenger-compose" onSubmit={send}>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={4000} placeholder="پیام خود را بنویس..." />
                <button type="submit" className="student-portal-button primary" disabled={sending || !draft.trim()}>{sending ? "در حال ارسال..." : "ارسال پیام"}</button>
              </form>
            ) : <div className="student-messenger-compose-closed">این گفت‌وگو بسته است.</div>}
          </> : <div className="student-messenger-empty"><strong>{loading ? "در حال بارگذاری..." : "گفت‌وگویی انتخاب نشده است"}</strong><p>از فهرست کناری یک گفت‌وگو را باز کن.</p></div>}
        </section>
      </div>
    </div>
  );
}
