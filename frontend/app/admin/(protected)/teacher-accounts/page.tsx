"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Tutor={id:number;first_name:string;last_name:string;field:"physics"|"computer";status:string;is_public:boolean};
type Account={id:number;tutor_profile_id:number;phone:string;display_name:string;is_active:boolean;created_at:string};
async function json<T>(r:Response):Promise<T>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(typeof d.detail==="string"?d.detail:"درخواست انجام نشد.");return d as T;}

export default function TeacherAccountsPage(){
 const [tutors,setTutors]=useState<Tutor[]>([]),[accounts,setAccounts]=useState<Account[]>([]);
 const [profileId,setProfileId]=useState(""),[phone,setPhone]=useState(""),[name,setName]=useState(""),[password,setPassword]=useState("");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const available=useMemo(()=>tutors.filter(t=>t.status==="active"&&t.is_public&&!accounts.some(a=>a.tutor_profile_id===t.id)),[tutors,accounts]);
 const load=useCallback(async()=>{const [people,users]=await Promise.all([
  json<Tutor[]>(await fetch("/api/people/admin/tutors",{credentials:"same-origin",cache:"no-store"})),
  json<{items:Account[];total:number}>(await fetch("/api/auth/admin/teacher-accounts",{credentials:"same-origin",cache:"no-store"}))
 ]);setTutors(people);setAccounts(users.items);},[]);
 useEffect(()=>{let active=true;Promise.all([
  fetch("/api/people/admin/tutors",{credentials:"same-origin",cache:"no-store"}).then(json<Tutor[]>),
  fetch("/api/auth/admin/teacher-accounts",{credentials:"same-origin",cache:"no-store"}).then(json<{items:Account[];total:number}>)
 ]).then(([p,a])=>{if(active){setTutors(p);setAccounts(a.items);}}).catch(e=>{if(active)setError(e.message||"دریافت اطلاعات انجام نشد.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 function choose(value:string){setProfileId(value);const t=tutors.find(x=>String(x.id)===value);if(t)setName(t.first_name+" "+t.last_name);}
 async function create(e:FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const a=await json<Account>(await fetch("/api/auth/admin/teacher-accounts",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({tutor_profile_id:Number(profileId),phone,display_name:name,password})}));setNotice("حساب مدرس «"+a.display_name+"» ساخته شد.");setProfileId("");setPhone("");setName("");setPassword("");await load();}catch(e){setError(e instanceof Error?e.message:"ساخت حساب انجام نشد.");}finally{setBusy(false);}}
 async function toggle(a:Account){setError("");setNotice("");try{await json(await fetch("/api/auth/admin/teacher-accounts/"+a.id+"?is_active="+String(!a.is_active),{method:"PATCH",credentials:"same-origin"}));setNotice(a.is_active?"حساب مدرس غیرفعال شد.":"حساب مدرس فعال شد.");await load();}catch(e){setError(e instanceof Error?e.message:"تغییر وضعیت انجام نشد.");}}
 return <div className="space-y-6">
  <header><p className="text-xs font-bold tracking-widest text-blue-600">TEACHER ACCESS</p><h1 className="mt-1 text-2xl font-black text-slate-900">حساب‌های مستقل مدرسان</h1><p className="mt-1 text-sm text-slate-500">برای پروفایل مدرس عمومی و فعال، حساب ورود مستقل ایجاد و دسترسی را مدیریت کن.</p></header>
  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}{notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}
  <form onSubmit={create} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
   <div className="md:col-span-2"><h2 className="font-black">ساخت حساب مدرس</h2><p className="mt-1 text-xs text-slate-500">حساب مدرس از نقش‌های مدیر، دانش‌آموز و مشاور مستقل است.</p></div>
   <label className="grid gap-1 text-xs font-bold">پروفایل مدرس<select required value={profileId} onChange={e=>choose(e.target.value)} className="min-h-11 rounded-lg border px-3 text-sm"><option value="">انتخاب مدرس فعال</option>{available.map(t=><option key={t.id} value={t.id}>#{t.id} · {t.first_name} {t.last_name} · {t.field==="physics"?"فیزیک":"کامپیوتر"}</option>)}</select></label>
   <label className="grid gap-1 text-xs font-bold">نام نمایشی<input required minLength={2} maxLength={180} value={name} onChange={e=>setName(e.target.value)} className="min-h-11 rounded-lg border px-3 text-sm"/></label>
   <label className="grid gap-1 text-xs font-bold">شماره همراه ورود<input required inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="0912..." className="min-h-11 rounded-lg border px-3 text-sm"/></label>
   <label className="grid gap-1 text-xs font-bold">رمز عبور اولیه<input required minLength={10} maxLength={72} type="password" value={password} onChange={e=>setPassword(e.target.value)} className="min-h-11 rounded-lg border px-3 text-sm"/></label>
   <button disabled={busy||!profileId||password.length<10} className="justify-self-start rounded-lg bg-blue-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{busy?"در حال ساخت...":"ایجاد حساب مدرس"}</button>
  </form>
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
   <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black">حساب‌های ثبت‌شده</h2><p className="mt-1 text-xs text-slate-500">{accounts.length.toLocaleString("fa-IR")} حساب</p></div>
   {loading?<p className="p-8 text-center text-xs text-slate-400">در حال بارگذاری...</p>:accounts.length?<div className="divide-y divide-slate-100">{accounts.map(a=><article key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><strong className="block text-sm">{a.display_name}</strong><small className="text-xs text-slate-400">پروفایل #{a.tutor_profile_id} · {a.phone}</small></div><div className="flex items-center gap-3"><span className={"rounded-full px-3 py-1 text-[10px] font-bold "+(a.is_active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500")}>{a.is_active?"فعال":"غیرفعال"}</span><button type="button" onClick={()=>toggle(a)} className="rounded-lg border px-3 py-2 text-[10px] font-bold">{a.is_active?"غیرفعال‌سازی":"فعال‌سازی"}</button></div></article>)}</div>:<p className="p-8 text-center text-xs text-slate-400">هنوز حساب مدرس ساخته نشده است.</p>}
  </section>
 </div>;
}
