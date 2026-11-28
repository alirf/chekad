import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherLogoutButton } from "./logout-button";

export const dynamic="force-dynamic";
type Teacher={id:number;tutor_profile_id:number;phone:string;display_name:string};

export default async function TeacherProtectedLayout({children}:{children:React.ReactNode}){
 const jar=await cookies(),token=jar.get("chekad_teacher_token")?.value;
 if(!token)redirect("/teacher/login");
 const base=(process.env.AUTH_INTERNAL_URL||"http://auth-service:8000").replace(/\/$/,"");
 let response:Response;
 try{response=await fetch(base+"/teacher/me",{headers:{Cookie:"chekad_teacher_token="+token},cache:"no-store"});}catch{redirect("/teacher/login?reason=auth-unavailable");}
 if(!response.ok)redirect("/teacher/login");
 const teacher=await response.json() as Teacher;
 return <div dir="rtl" className="min-h-screen bg-slate-50">
  <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
   <Link href="/teacher" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-xl font-black text-white">چ</span><span><strong className="block text-sm font-black">چکاد</strong><small className="text-[10px] text-slate-500">پنل مدرس و دبیر</small></span></Link>
   <nav className="flex flex-wrap items-center gap-1 text-xs font-bold text-slate-600"><Link href="/teacher" className="rounded-lg px-3 py-2 hover:bg-blue-50">خانه</Link><Link href="/teacher/messages" className="rounded-lg px-3 py-2 hover:bg-blue-50">پیام‌ها</Link><Link href="/teacher/weekly-plan" className="rounded-lg px-3 py-2 hover:bg-blue-50">برنامه هفتگی شاگردان</Link><span className="hidden px-2 text-slate-400 sm:inline">{teacher.display_name}</span><TeacherLogoutButton/></nav>
  </div></header>
  <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
 </div>;
}
