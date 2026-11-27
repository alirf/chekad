"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Application = {
  id: number; kind: "mentorship" | "tutoring"; tracking_code: string;
  field: string; status: string; created_at: string;
  student: { first_name: string; last_name: string; grade: string; guardian_phone: string };
  topic?: string | null; student_note?: string | null; description?: string | null;
  admin_note?: string | null; reject_reason?: string | null;
};
type Note = { id: number; content: string; admin_id: number; created_at: string };
type Detail = Application & { internal_notes: Note[] };
const statuses = ["new","reviewing","waiting_for_student","options_proposed","accepted","active","completed","rejected","cancelled"];
const labels: Record<string,string> = {
  new:"جدید", reviewing:"در حال بررسی", waiting_for_student:"در انتظار دانش‌آموز",
  options_proposed:"پیشنهاد منتور/مدرس", accepted:"پذیرفته‌شده", active:"فعال",
  completed:"تکمیل‌شده", rejected:"ردشده", cancelled:"لغوشده",
};
const fields: Record<string,string> = {physics:"فیزیک",computer:"کامپیوتر"};
const kinds: Record<string,string> = {mentorship:"منتورینگ",tutoring:"کلاس خصوصی"};

export default function AdminInboxPage() {
  const [items,setItems]=useState<Application[]>([]);
  const [total,setTotal]=useState(0);
  const [kind,setKind]=useState("all");
  const [status,setStatus]=useState("");
  const [field,setField]=useState("");
  const [q,setQ]=useState("");
  const [selected,setSelected]=useState<Detail|null>(null);
  const [nextStatus,setNextStatus]=useState("");
  const [rejectReason,setRejectReason]=useState("");
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    setError("");
    const params=new URLSearchParams({kind,limit:"50"});
    if(status) params.set("status",status);
    if(field) params.set("field",field);
    if(q.trim()) params.set("q",q.trim());
    try {
      const response=await fetch("/api/application/admin/applications?"+params.toString(),{credentials:"same-origin",cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.detail || "دریافت درخواست‌ها انجام نشد.");
      setItems(data.items); setTotal(data.total);
    } catch(e){setError(e instanceof Error?e.message:"خطای ارتباط");}
  },[kind,status,field,q]);

  useEffect(()=>{
    let active=true;
    const params=new URLSearchParams({kind,limit:"50"});
    if(status) params.set("status",status);
    if(field) params.set("field",field);
    if(q.trim()) params.set("q",q.trim());
    fetch("/api/application/admin/applications?"+params.toString(),{credentials:"same-origin",cache:"no-store"})
      .then(async response=>{
        const data=await response.json();
        if(!response.ok) throw new Error(data.detail || "دریافت درخواست‌ها انجام نشد.");
        return data;
      })
      .then(data=>{if(active){setItems(data.items);setTotal(data.total);setError("");}})
      .catch(error=>{if(active)setError(error instanceof Error?error.message:"خطای ارتباط");});
    return ()=>{active=false;};
  },[kind,status,field,q]);

  async function openDetail(item:Application){
    setError(""); setMessage("");
    try{
      const response=await fetch("/api/application/admin/applications/"+item.kind+"/"+item.id,{credentials:"same-origin",cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.detail || "دریافت جزئیات ناموفق بود.");
      setSelected(data); setNextStatus(data.status); setRejectReason(data.reject_reason || "");
    }catch(e){setError(e instanceof Error?e.message:"خطای ارتباط");}
  }

  async function updateStatus(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); if(!selected)return;
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/application/admin/applications/"+selected.kind+"/"+selected.id,{
        method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({status:nextStatus,reject_reason:nextStatus==="rejected"?rejectReason||null:null})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.detail || "تغییر وضعیت ناموفق بود.");
      setMessage("وضعیت درخواست به‌روزرسانی شد."); await load(); await openDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"خطای ارتباط");}
    finally{setBusy(false);}
  }

  async function addNote(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!selected||!note.trim())return;
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/application/admin/applications/"+selected.kind+"/"+selected.id+"/notes",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({content:note})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.detail || "ثبت یادداشت ناموفق بود.");
      setNote("");setMessage("یادداشت داخلی ثبت شد.");await openDetail(selected);
    }catch(e){setError(e instanceof Error?e.message:"خطای ارتباط");}
    finally{setBusy(false);}
  }

  return <main dir="rtl" className="space-y-6">
    <header><p className="text-sm font-bold text-blue-700">CHEKAD · CRM</p><h1 className="mt-1 text-3xl font-black text-slate-900">صندوق درخواست‌ها</h1><p className="mt-2 text-sm text-slate-600">پیگیری درخواست‌های منتورینگ و کلاس خصوصی</p></header>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
      <select aria-label="نوع درخواست" value={kind} onChange={e=>setKind(e.target.value)} className="rounded-lg border p-3"><option value="all">همه درخواست‌ها</option><option value="mentorship">منتورینگ</option><option value="tutoring">کلاس خصوصی</option></select>
      <select aria-label="وضعیت" value={status} onChange={e=>setStatus(e.target.value)} className="rounded-lg border p-3"><option value="">همه وضعیت‌ها</option>{statuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select>
      <select aria-label="رشته" value={field} onChange={e=>setField(e.target.value)} className="rounded-lg border p-3"><option value="">همه رشته‌ها</option><option value="physics">فیزیک</option><option value="computer">کامپیوتر</option></select>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="جست‌وجوی نام یا شماره سرپرست" className="rounded-lg border p-3"/>
    </section>
    <div className="text-sm text-slate-500">{total.toLocaleString("fa-IR")} درخواست</div>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {items.map(item=><button key={item.kind+"-"+item.id} onClick={()=>void openDetail(item)} className={"block w-full p-4 text-right hover:bg-blue-50 "+(selected?.id===item.id&&selected.kind===item.kind?"bg-blue-50":"")}>
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.student.first_name} {item.student.last_name}</strong><span className="text-xs text-slate-500" dir="ltr">{item.tracking_code}</span></div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600"><span>{kinds[item.kind]}</span><span>·</span><span>{fields[item.field]}</span><span>·</span><span>{labels[item.status]||item.status}</span></div>
            <p className="mt-2 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("fa-IR")}</p>
          </button>)}
          {!items.length&&<p className="p-8 text-center text-sm text-slate-500">درخواستی با این فیلترها پیدا نشد.</p>}
        </div>
      </div>
      <aside className="rounded-2xl border border-slate-200 bg-white p-5">
        {!selected?<p className="py-12 text-center text-sm text-slate-500">برای مشاهده جزئیات، یک درخواست را انتخاب کنید.</p>:<>
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-blue-700">{kinds[selected.kind]} · {selected.tracking_code}</p><h2 className="mt-1 text-xl font-black">{selected.student.first_name} {selected.student.last_name}</h2></div><button onClick={()=>setSelected(null)} className="text-sm text-slate-500">بستن</button></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">پایه</dt><dd>{selected.student.grade}</dd></div><div><dt className="text-slate-500">رشته</dt><dd>{fields[selected.field]}</dd></div><div className="col-span-2"><dt className="text-slate-500">شماره تماس سرپرست</dt><dd dir="ltr" className="text-right font-bold">{selected.student.guardian_phone}</dd></div></dl>
          {(selected.topic||selected.student_note||selected.description)&&<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-7"><strong>نیاز آموزشی</strong><p>{selected.topic||selected.student_note||selected.description}</p></div>}
          <form onSubmit={updateStatus} className="mt-5 space-y-3 border-t pt-4"><h3 className="font-bold">به‌روزرسانی وضعیت</h3><select value={nextStatus} onChange={e=>setNextStatus(e.target.value)} className="w-full rounded-lg border p-3">{statuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select>{nextStatus==="rejected"&&<textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="دلیل رد درخواست" className="w-full rounded-lg border p-3"/>}<button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50">ثبت وضعیت</button></form>
          <form onSubmit={addNote} className="mt-5 space-y-3 border-t pt-4"><h3 className="font-bold">یادداشت داخلی</h3><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={2000} placeholder="یادداشت قابل مشاهده فقط برای مدیران" className="w-full rounded-lg border p-3"/><button disabled={busy||!note.trim()} className="rounded-lg border px-4 py-2 font-bold disabled:opacity-50">افزودن یادداشت</button></form>
          <div className="mt-5 border-t pt-4"><h3 className="font-bold">سوابق یادداشت‌ها</h3>{selected.internal_notes?.length?selected.internal_notes.map(n=><div key={n.id} className="mt-2 rounded-lg bg-slate-50 p-3 text-sm"><p>{n.content}</p><p className="mt-1 text-xs text-slate-400">مدیر {n.admin_id} · {new Date(n.created_at).toLocaleString("fa-IR")}</p></div>):<p className="mt-2 text-sm text-slate-500">یادداشتی ثبت نشده است.</p>}</div>
        </>}
      </aside>
    </section>
  </main>;
}
