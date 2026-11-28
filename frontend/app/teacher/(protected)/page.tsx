"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeacherAuthError } from "../../../lib/teacher-auth";
import { fetchTeacherAssignments, TeacherPortalError, type TeacherAssignment } from "../../../lib/teacher-portal";

export default function TeacherHomePage(){
 const router=useRouter(),[assignments,setAssignments]=useState<TeacherAssignment[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let active=true;fetchTeacherAssignments().then(r=>{if(active)setAssignments(r.items);}).catch(e=>{if(!active)return;if((e instanceof TeacherAuthError||e instanceof TeacherPortalError)&&e.status===401)router.replace("/teacher/login");else setError(e instanceof Error?e.message:"دریافت کلاس‌ها انجام نشد.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[router]);
 const active=useMemo(()=>assignments.filter(x=>x.status==="active"),[assignments]),done=useMemo(()=>assignments.filter(x=>x.status==="completed"),[assignments]);
 return <div className="space-y-6">
  <header><p className="text-xs font-bold tracking-widest text-blue-600">TEACHER WORKSPACE</p><h1 className="mt-1 text-2xl font-black text-slate-900">خانه پنل مدرس</h1><p className="mt-1 text-sm text-slate-500">کلاس‌های خصوصی تخصیص‌یافته، گفت‌وگوها و برنامه مطالعه شاگردان خودت را مدیریت کن.</p></header>
  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
  <div className="grid gap-3 sm:grid-cols-3"><article className="rounded-2xl border bg-white p-5"><small className="text-xs text-slate-500">کلاس‌های فعال</small><strong className="mt-2 block text-3xl font-black">{loading?"—":active.length.toLocaleString("fa-IR")}</strong></article><article className="rounded-2xl border bg-white p-5"><small className="text-xs text-slate-500">کلاس‌های تکمیل‌شده</small><strong className="mt-2 block text-3xl font-black">{loading?"—":done.length.toLocaleString("fa-IR")}</strong></article><article className="rounded-2xl border bg-white p-5"><small className="text-xs text-slate-500">کل تخصیص‌ها</small><strong className="mt-2 block text-3xl font-black">{loading?"—":assignments.length.toLocaleString("fa-IR")}</strong></article></div>
  <div className="grid gap-4 md:grid-cols-2"><Link href="/teacher/messages" className="rounded-2xl border bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"><span className="text-2xl text-blue-600">✉</span><strong className="mt-3 block text-sm">پیام‌های دانش‌آموزان</strong><p className="mt-1 text-xs leading-6 text-slate-500">فقط گفت‌وگوهای کلاس‌های تخصیص‌یافته به تو نمایش داده می‌شوند.</p></Link><Link href="/teacher/weekly-plan" className="rounded-2xl border bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"><span className="text-2xl text-blue-600">◷</span><strong className="mt-3 block text-sm">برنامه هفتگی شاگردان</strong><p className="mt-1 text-xs leading-6 text-slate-500">فعالیت‌های مطالعه را برای هر شاگرد با زمان و مدت مشخص تنظیم کن.</p></Link></div>
  <section className="rounded-2xl border bg-white p-5"><h2 className="mb-4 font-black">کلاس‌های فعال من</h2>{loading?<p className="py-6 text-center text-xs text-slate-400">در حال بارگذاری...</p>:active.length?<div className="grid gap-2 sm:grid-cols-2">{active.map(x=><article key={x.id} className="rounded-xl border border-slate-100 p-4"><strong className="block text-sm">{x.student_name}</strong><small className="mt-1 block text-[10px] text-slate-500">{x.topic} · {x.field==="physics"?"فیزیک":"کامپیوتر"} · تخصیص #{x.id}</small><small className="mt-1 block text-[10px] text-slate-400">شروع همکاری: {x.start_date}</small></article>)}</div>:<p className="py-6 text-center text-xs text-slate-400">هنوز کلاس فعالی به این حساب تخصیص داده نشده است.</p>}</section>
 </div>;
}
