"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createStudentMessageThread,
  fetchStudentMessageThreads,
  fetchStudentThreadMessages,
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

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) || null, [threads, selectedId]);

  const loadThreads = useCallback(async () => {
    const result = await fetchStudentMessageThreads();
    setThreads(result.items);
    setSelectedId((current) => current && result.items.some((item) => item.id === current) ? current : (result.items[0]?.id ?? null));
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    const result = await fetchStudentThreadMessages(id);
    setMessages(result.items);
    setThreads((current) => current.map((thread) => thread.id === id ? { ...thread, unread_count: 0 } : thread));
  }, []);

  useEffect(() => {
    let active = true;
    fetchStudentMessageThreads()
      .then((result) => {
        if (!active) return;
        setThreads(result.items);
        setSelectedId(result.items[0]?.id ?? null);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت گفت‌وگوها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await fetchStudentThreadMessages(selectedId);
        if (active) {
          setMessages(result.items);
          setThreads((current) => current.map((thread) => thread.id === selectedId ? { ...thread, unread_count: 0 } : thread));
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "دریافت پیام‌ها انجام نشد.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selectedId]);

  async function startConversation() {
    setCreating(true); setError(""); setNotice("");
    try {
      const thread = await createStudentMessageThread(subject);
      await loadThreads();
      setSelectedId(thread.id);
      setNotice("گفت‌وگو آماده است. پیام خودت را بنویس.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ساخت گفت‌وگو انجام نشد."); }
    finally { setCreating(false); }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true); setError(""); setNotice("");
    try {
      await sendStudentMessage(selected.id, draft.trim());
      setDraft("");
      await loadMessages(selected.id);
      await loadThreads();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ارسال پیام انجام نشد."); }
    finally { setSending(false); }
  }

  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="CHEKAD MESSENGER" title="پیام‌ها" description="برای پیگیری درخواست‌ها و پرسیدن سؤال، با تیم چکاد گفت‌وگو کن." />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {notice && <div className="student-portal-alert success" role="status">{notice}</div>}
      <div className="student-messenger-layout">
        <aside className="student-messenger-contacts">
          <div className="student-messenger-contact-heading"><strong>گفت‌وگوها</strong><span>{threads.length}</span></div>
          <div className="student-messenger-contact-list">
            {threads.map((thread) => (
              <button type="button" key={thread.id} className={"student-messenger-contact" + (selectedId === thread.id ? " is-active" : "")} onClick={() => setSelectedId(thread.id)}>
                <span className="student-messenger-contact-avatar">چ</span>
                <span className="student-messenger-contact-copy"><strong>{thread.subject}</strong><small>{formatPortalDateTime(thread.last_message_at)}</small></span>
                {(thread.unread_count || 0) > 0 && <b>{thread.unread_count}</b>}
              </button>
            ))}
            {!threads.length && !loading && <p className="student-messenger-no-threads">هنوز گفت‌وگویی شروع نشده است.</p>}
          </div>
          <div className="student-messenger-new">
            <label htmlFor="support-subject">موضوع گفت‌وگو</label>
            <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={140} />
            <button type="button" className="student-portal-button primary full" onClick={startConversation} disabled={creating || subject.trim().length < 3}>
              {creating ? "در حال آماده‌سازی..." : threads.length ? "باز کردن گفت‌وگوی پشتیبانی" : "شروع گفت‌وگوی جدید"}
            </button>
          </div>
        </aside>

        <section className="student-messenger-chat" aria-label="محتوای گفت‌وگو">
          {selected ? (
            <>
              <header className="student-messenger-chat-header">
                <span className="student-messenger-contact-avatar">چ</span>
                <div><strong>{selected.subject}</strong><small>{selected.status === "open" ? "گفت‌وگوی فعال با پشتیبانی چکاد" : "گفت‌وگوی بسته‌شده"}</small></div>
                <span className="student-messenger-online"><i /> پشتیبانی چکاد</span>
              </header>
              <div className="student-messenger-messages">
                {messages.map((message) => (
                  <article key={message.id} className={"student-message-bubble " + (message.sender_type === "student" ? "from-student" : "from-admin")}>
                    <p>{message.body}</p>
                    <time>{formatPortalDateTime(message.created_at)}{message.sender_type === "student" && message.read_at ? " · دیده‌شده" : ""}</time>
                  </article>
                ))}
                {!messages.length && <PortalEmptyState icon="✉" title="اولین پیام را ارسال کن" description="پیام تو فقط برای تیم پشتیبانی چکاد قابل مشاهده است." />}
              </div>
              {selected.status === "open" ? (
                <form className="student-messenger-compose" onSubmit={submitMessage}>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} placeholder="پیامت را بنویس..." rows={2} aria-label="متن پیام" />
                  <button type="submit" className="student-messenger-send" disabled={sending || !draft.trim()}>{sending ? "..." : "ارسال پیام"} <span>➤</span></button>
                </form>
              ) : <div className="student-messenger-closed">این گفت‌وگو بسته شده است. برای ادامه، گفت‌وگوی جدیدی بساز.</div>}
            </>
          ) : (
            <div className="student-messenger-welcome">
              <PortalEmptyState icon="✉" title="گفت‌وگو با چکاد" description="برای ارتباط با پشتیبانی، یک گفت‌وگو ایجاد کن. پیام‌ها در همین پنل نگهداری می‌شوند." />
            </div>
          )}
        </section>
      </div>

      <section className="student-advisor-message-card">
        <span className="student-advisor-message-icon">◎</span>
        <div><strong>گفت‌وگو با مشاور اختصاصی</strong><p>این بخش پس از انتساب مشاور و فعال‌شدن حساب امن مشاور در سامانه باز می‌شود. در حال حاضر پیام‌رسان فعال، گفت‌وگوی دانش‌آموز با پشتیبانی چکاد است.</p></div>
        <span className="student-portal-status status-pending">در انتظار فعال‌سازی</span>
      </section>
    </div>
  );
}
