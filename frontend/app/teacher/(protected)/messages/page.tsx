"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeacherAuthError } from "../../../../lib/teacher-auth";
import {
 fetchTeacherThreads,fetchTeacherThreadMessages,openTeacherMessageSocket,sendTeacherMessage,
 TeacherPortalError,type TeacherThread,
} from "../../../../lib/teacher-portal";
import type { PortalMessage } from "../../../../lib/student-auth";

function dt(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(d);}
export default function TeacherMessagesPage(){
 const router=useRouter(),[threads,setThreads]=useState<TeacherThread[]>([]),[selectedId,setSelectedId]=useState<number|null>(null),[messages,setMessages]=useState<PortalMessage[]>([]);
 const [draft,setDraft]=useState(""),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[live,setLive]=useState(false);
 const selected=useMemo(()=>threads.find(x=>x.id===selectedId)||null,[threads,selectedId]);
 async function loadThreads(){const r=await fetchTeacherThreads();setThreads(r.items);setSelectedId(v=>v&&r.items.some(x=>x.id===v)?v:(r.items[0]?.id??null));}
 useEffect(()=>{let active=true;fetchTeacherThreads().then(r=>{if(active){setThreads(r.items);setSelectedId(r.items[0]?.id??null);}}).catch(e=>{if(!active)return;if((e instanceof TeacherAuthError||e instanceof TeacherPortalError)&&e.status===401)router.replace("/teacher/login");else setError(e instanceof Error?e.message:"دریافت گفت‌وگوها انجام نشد.");}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[router]);
 useEffect(()=>{if(selectedId===null)return;let active=true,socket:WebSocket|null=null,retry:ReturnType<typeof setTimeout>|null=null,fallback:ReturnType<typeof setInterval>|null=null;
  const refresh=()=>{void fetchTeacherThreadMessages(selectedId).then(r=>{if(active)setMessages(r.items);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"دریافت پیام‌ها انجام نشد.");});};
  const startFallback=()=>{if(!fallback&&active)fallback=window.setInterval(refresh,12000);};
  const stopFallback=()=>{if(fallback)window.clearInterval(fallback);fallback=null;};
  const connect=()=>{if(!active)return;try{socket=openTeacherMessageSocket(selectedId,m=>{if(active)setMessages(cur=>cur.some(x=>x.id===m.id)?cur:[...cur,m]);},()=>{if(active){setLive(true);stopFallback();}},()=>{if(active){setLive(false);startFallback();retry=window.setTimeout(connect,2500);}});}catch{setLive(false);startFallback();}};
  refresh();connect();return()=>{active=false;setLive(false);stopFallback();if(retry)window.clearTimeout(retry);socket?.close();};
 },[selectedId]);
 async function send(e:FormEvent){e.preventDefault();if(!selected||!draft.trim())return;setSending(true);setError("");setNotice("");try{await sendTeacherMessage(selected.id,draft.trim());setDraft("");const r=await fetchTeacherThreadMessages(selected.id);setMessages(r.items);await loadThreads();setNotice("پاسخ برای دانش‌آموز ارسال شد.");}catch(e){if((e instanceof TeacherAuthError||e instanceof TeacherPortalError)&&e.status===401)router.replace("/teacher/login");else setError(e instanceof Error?e.message:"ارسال پیام انجام نشد.");}finally{setSending(false);}}
 return <div className="space-y-5">
  <header><p className="text-xs font-bold tracking-widest text-blue-600">TEACHER MESSENGER</p><h1 className="mt-1 text-2xl font-black">پیام‌های دانش‌آموزان</h1><p className="mt-1 text-sm text-slate-500">فقط گفت‌وگوهای کلاس‌های خصوصی تخصیص‌یافته به تو نمایش داده می‌شوند.</p><Link className="mt-3 inline-flex rounded-lg border bg-white px-3 py-2 text-xs font-bold" href="/teacher/weekly-plan">مدیریت برنامه شاگردان</Link></header>
  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}{notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{notice}</div>}
  <div className="grid min-h-[600px] overflow-hidden rounded-2xl border bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
   <aside className="border-b lg:border-b-0 lg:border-l"><div className="flex items-center justify-between border-b px-4 py-4"><strong className="text-sm">شاگردان من</strong><span className="text-xs text-slate-400">{threads.length}</span></div><div className="max-h-[560px] overflow-y-auto p-2">{threads.map(t=><button key={t.id} type="button" onClick={()=>setSelectedId(t.id)} className={"flex w-full items-center gap-3 rounded-xl p-3 text-right "+(selectedId===t.id?"bg-blue-50":"hover:bg-slate-50")}><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-black text-blue-700">{t.student_name.slice(0,1)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{t.student_name}</strong><small className="mt-1 block truncate text-[10px] text-slate-400">{t.topic} · {dt(t.last_message_at)}</small></span>{t.unread_count>0&&<b className="rounded-full bg-rose-500 px-2 py-1 text-[9px] text-white">{t.unread_count}</b>}</button>)}{!loading&&!threads.length&&<p className="p-6 text-center text-xs text-slate-400">هنوز گفت‌وگویی از شاگردانت شروع نشده است.</p>}{loading&&<p className="p-6 text-center text-xs text-slate-400">در حال بارگذاری...</p>}</div></aside>
   <section className="flex min-w-0 flex-col bg-slate-50">{selected?<><header className="flex items-center justify-between gap-3 border-b bg-white px-5 py-4"><div><strong className="text-sm">{selected.student_name}</strong><p className="mt-1 text-[10px] text-slate-400">{selected.field==="physics"?"المپیاد فیزیک":"المپیاد کامپیوتر"} · {selected.topic}</p></div><span className="text-[10px] text-slate-500">{live?"اتصال بلادرنگ":"همگام‌سازی دوره‌ای"}</span></header><div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">{messages.map(m=><article key={m.id} className={"max-w-[82%] rounded-xl border px-4 py-3 shadow-sm "+(m.sender_type==="teacher"?"mr-auto border-blue-100 bg-blue-50":"ml-auto border-slate-200 bg-white")}><p className="whitespace-pre-wrap break-words text-xs leading-7 text-slate-700">{m.body}</p><time className="mt-2 block text-left text-[9px] text-slate-400">{dt(m.created_at)}</time></article>)}{!messages.length&&<p className="m-auto text-xs text-slate-400">هنوز پیامی در این گفت‌وگو وجود ندارد.</p>}</div>{selected.status==="open"?<form onSubmit={send} className="flex items-end gap-3 border-t bg-white p-3"><textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={2} maxLength={4000} placeholder="پاسخ خود را بنویس..." className="min-h-12 flex-1 resize-y rounded-xl border p-3 text-xs"/><button disabled={sending||!draft.trim()} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{sending?"...":"ارسال پاسخ"}</button></form>:<div className="bg-white p-4 text-center text-xs text-slate-400">این گفت‌وگو بسته است.</div>}</>:<div className="m-auto p-6 text-center text-xs text-slate-400">یک گفت‌وگو را انتخاب کن.</div>}</section>
  </div>
 </div>;
}
