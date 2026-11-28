"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchStudentNotifications } from "../lib/student-auth";

export function StudentNotificationIndicator() {
  const [unread, setUnread] = useState(0);
  const refresh = useCallback(async () => {
    try { setUnread((await fetchStudentNotifications()).unread_count); }
    catch { /* Notifications may be temporarily unavailable. */ }
  }, []);
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);
  return (
    <Link href="/dashboard/notifications" className="student-portal-notification"
      aria-label={unread ? "اعلان‌ها، " + unread + " اعلان خوانده‌نشده" : "اعلان‌ها"}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      {unread > 0 && <i>{unread > 99 ? "۹۹+" : unread.toLocaleString("fa-IR")}</i>}
    </Link>
  );
}
