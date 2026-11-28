"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutTeacher } from "../../../lib/teacher-auth";

export function TeacherLogoutButton(){
 const router=useRouter(),[busy,setBusy]=useState(false);
 async function logout(){setBusy(true);try{await logoutTeacher();}finally{router.replace("/teacher/login");router.refresh();setBusy(false);}}
 return <button type="button" onClick={logout} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-50">{busy?"...":"خروج"}</button>;
}
