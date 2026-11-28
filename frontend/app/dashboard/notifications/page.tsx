"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchStudentNotifications, markAllStudentNotificationsRead,
  markStudentNotificationRead, type StudentNotification,
} from "../../../lib/student-auth";
import { PortalEmptyState, PortalPageHeading, formatPortalDateTime } from "../../../components/student-portal-ui";

const categoryLabels: Record<string, string> = {
  application: "درخواست", assignment: "همکاری آموزشی", message: "پیام",
  mentor_report: "بازخورد منتور", weekly_plan: "برنامه هفتگی", invoice: "فاکتور",
};

export default function StudentNotificationsPage() {
  const [items, setItems] = useState<StudentNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchStudentNotifications().then((result) => {
      if (active) { setItems(result.items); setUnread(result.unread_count); }
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "دریافت اعلان‌ها انجام نشد.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function markRead(item: StudentNotification) {
    if (item.read_at || busy) return;
    setBusy(true); setError("");
    try {
      const updated = await markStudentNotificationRead(item.id);
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setUnread((current) => Math.max(0, current - 1));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "به‌روزرسانی اعلان انجام نشد.");
    } finally { setBusy(false); }
  }

  async function markAllRead() {
    if (!unread || busy) return;
    setBusy(true); setError("");
    try {
      await markAllStudentNotificationsRead();
      setItems((current) => current.map((item) => item.read_at ? item : { ...item, read_at: new Date().toISOString() }));
      setUnread(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "به‌روزرسانی اعلان‌ها انجام نشد.");
    } finally { setBusy(false); }
  }

  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="NOTIFICATION CENTER" title="اعلان‌های چکاد"
        description="تغییر وضعیت درخواست‌ها، پیام‌های تازه، برنامه‌ها و گزارش‌های جدید را اینجا دنبال کن."
        action={<button type="button" className="student-portal-button secondary" onClick={() => void markAllRead()} disabled={!unread || busy}>خواندن همه</button>} />
      <div className="student-notification-summary">
        <strong>{unread.toLocaleString("fa-IR")}</strong><span>اعلان خوانده‌نشده</span>
        <small>{items.length.toLocaleString("fa-IR")} اعلان اخیر در این حساب</small>
      </div>
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      {loading ? <div className="student-portal-loading">در حال دریافت اعلان‌ها...</div> : items.length ? (
        <section className="student-notification-list" aria-label="فهرست اعلان‌ها">
          {items.map((item) => (
            <article key={item.id} className={"student-notification-item" + (!item.read_at ? " is-unread" : "")}>
              <span className="student-notification-dot" aria-hidden="true" />
              <div className="student-notification-copy">
                <div className="student-notification-meta">
                  <span>{categoryLabels[item.category] || "اطلاع‌رسانی"}</span>
                  <time dateTime={item.created_at}>{formatPortalDateTime(item.created_at)}</time>
                </div>
                <strong>{item.title}</strong><p>{item.body}</p>
                <div className="student-notification-actions">
                  <Link href={item.href} onClick={() => void markRead(item)}>مشاهده بخش مرتبط ←</Link>
                  {!item.read_at && <button type="button" onClick={() => void markRead(item)} disabled={busy}>علامت‌گذاری به‌عنوان خوانده‌شده</button>}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <PortalEmptyState icon="♧" title="اعلان تازه‌ای نداری"
          description="وقتی وضعیت درخواست، پیام، برنامه، گزارش یا فاکتورت تغییر کند، اطلاع‌رسانی آن در این صفحه باقی می‌ماند."
          action={<Link className="student-portal-button secondary" href="/dashboard">بازگشت به داشبورد</Link>} />
      )}
    </div>
  );
}
