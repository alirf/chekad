"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MentorAuthError } from "../../../lib/mentor-auth";
import { fetchMentorAssignments, MentorPortalError, type MentorAssignment } from "../../../lib/mentor-portal";
import { PortalEmptyState } from "../../../components/student-portal-ui";

export default function MentorHomePage(){
 const router=useRouter();
 const [rows,setRows]=useState<MentorAssignment[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let active=true;fetchMentorAssignments().then(r=>{if(active)setRows(r.items);}).catch(e=>{if(!active)return;if((e instanceof MentorAuthError||e instanceof MentorPortalError)&&e.status===401)router.replace("/mentor/login");else setError(e instanceof Error?e.message:"دریافت شاگردان انجام نشد.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[router]);
 const active=useMemo(()=>rows.filter(x=>x.status==="active"),[rows]),done=useMemo(()=>rows.filter(x=>x.status==="completed"),[rows]);
 return <div className="space-y-6">
  <header><p className="text-xs font-bold tracking-widest text-blue-600">MENTOR WORKSPACE</p><h1 className="mt-1 text-2xl font-black text-slate-900">خانه پنل مشاور</h1><p className="mt-1 text-sm text-slate-500">شاگردان تخصیص‌یافته، گفت‌وگوها، گزارش‌های مطالعه و برنامه هفتگی را از اینجا مدیریت کن.</p></header>
  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
  <div className="grid gap-3 sm:grid-cols-3">
   <article className="rounded-2xl border bg-white p-5"><small className="text-xs text-slate-500">شاگردان فعال</small><strong className="mt-2 block text-3xl font-black">{loading?"—":active.length.toLocaleString("fa-IR")}</strong></article>
   <article className="rounded-2xl border bg-white p-5"><small className="text-xs text-slate-500">همکاری تکمیل‌شده</small><strong className="mt-2 block text-3xl font-black">{loading?"—":done.length.toLocaleString("fa-IR")}</strong></article>
   <article className="rounded-2xl border bg-white p-5"><small className="text-xs text-slate-500">کل تخصیص‌ها</small><strong className="mt-2 block text-3xl font-black">{loading?"—":rows.length.toLocaleString("fa-IR")}</strong></article>
  </div>
  <div className="grid gap-4 md:grid-cols-3">
   <Link href="/mentor/messages" className="rounded-2xl border bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"><span className="text-2xl text-blue-600">✉</span><strong className="mt-3 block text-sm">پیام‌های دانش‌آموزان</strong><p className="mt-1 text-xs leading-6 text-slate-500">گفت‌وگوهای اختصاصی شاگردانت را پیگیری کن.</p></Link>
   <Link href="/mentor/reports" className="rounded-2xl border bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"><span className="text-2xl text-blue-600">▤</span><strong className="mt-3 block text-sm">گزارش مطالعه و بازخورد</strong><p className="mt-1 text-xs leading-6 text-slate-500">گزارش روزانه را بررسی و ارزیابی هفتگی ثبت کن.</p></Link>
   <Link href="/mentor/weekly-plan" className="rounded-2xl border bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"><span className="text-2xl text-blue-600">◷</span><strong className="mt-3 block text-sm">برنامه هفتگی شاگردان</strong><p className="mt-1 text-xs leading-6 text-slate-500">برنامه ساعت‌به‌ساعت مطالعه را تنظیم کن.</p></Link>
  </div>
  <section className="rounded-2xl border bg-white p-5">
   <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">شاگردان فعال من</h2><p className="mt-1 text-xs text-slate-500">فقط تخصیص‌های متصل به پروفایل این مشاور نمایش داده می‌شوند.</p></div><Link href="/mentor/weekly-plan" className="text-xs font-bold text-blue-600">تنظیم برنامه</Link></div>
   {loading?<p className="py-8 text-center text-xs text-slate-400">در حال بارگذاری...</p>:active.length?<div className="grid gap-2 sm:grid-cols-2">{active.map(x=><article key={x.id} className="rounded-xl border border-slate-100 p-4"><strong className="block text-sm">{x.student_name}</strong><small className="mt-1 block text-[10px] text-slate-500">{x.field==="physics"?"المپیاد فیزیک":"المپیاد کامپیوتر"} · {x.grade||"پایه نامشخص"} · تخصیص #{x.id}</small><small className="mt-1 block text-[10px] text-slate-400">شروع همکاری: {x.start_date}{x.end_date?" · پایان: "+x.end_date:""}</small></article>)}</div>:<PortalEmptyState icon="◎" title="هنوز شاگرد فعالی تخصیص داده نشده" description="پس از تخصیص درخواست توسط تیم چکاد، اطلاعات شاگرد در این بخش نمایش داده می‌شود."/>}
  </section>
  <p className="text-[10px] leading-6 text-slate-400">اطلاعات و عملیات این پنل به شناسه پروفایل مشاور محدود است؛ شاگردان مشاوران دیگر قابل مشاهده نیستند.</p>
 </div>;
}
