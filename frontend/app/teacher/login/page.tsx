"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginTeacher, TeacherAuthError } from "../../../lib/teacher-auth";

export default function TeacherLoginPage(){
 const router=useRouter(),[phone,setPhone]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");try{await loginTeacher(phone,password);router.replace("/teacher");router.refresh();}catch(e){setError(e instanceof TeacherAuthError?e.message:e instanceof Error?e.message:"ورود انجام نشد.");}finally{setBusy(false);}}
 return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"><section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
  <div className="mb-7 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-2xl font-black text-white">چ</span><div><strong className="block text-lg font-black">چکاد</strong><small className="text-xs text-slate-500">پنل مدرس و دبیر</small></div></div>
  <h1 className="text-xl font-black text-slate-900">ورود مدرس</h1><p className="mt-2 text-sm leading-7 text-slate-500">با حساب مستقل خود وارد شو تا کلاس‌های تخصیص‌یافته، پیام‌های دانش‌آموزان و برنامه هفتگی آن‌ها را مدیریت کنی.</p>
  {error&&<div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700">{error}</div>}
  <form onSubmit={submit} className="mt-6 grid gap-4">
   <label className="grid gap-2 text-xs font-bold">شماره همراه<input autoComplete="username" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} required className="min-h-12 rounded-xl border px-4 text-sm" placeholder="۰۹۱۲۱۲۳۴۵۶۷"/></label>
   <label className="grid gap-2 text-xs font-bold">رمز عبور<input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="min-h-12 rounded-xl border px-4 text-sm"/></label>
   <button type="submit" disabled={busy||!phone.trim()||!password} className="mt-2 min-h-12 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy?"در حال ورود...":"ورود به پنل مدرس"}</button>
  </form>
  <p className="mt-6 border-t border-slate-100 pt-4 text-[11px] leading-6 text-slate-400">حساب مدرس توسط مدیر چکاد ایجاد می‌شود. در صورت نداشتن حساب با تیم چکاد تماس بگیر.</p>
 </section></main>;
}
