"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutMentor } from "../../../lib/mentor-auth";

export function MentorLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await logoutMentor(); }
    finally { router.replace("/mentor/login"); router.refresh(); setBusy(false); }
  }
  return <button type="button" onClick={logout} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{busy ? "..." : "خروج"}</button>;
}
