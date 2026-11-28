import Link from "next/link";
import { PortalEmptyState, PortalPageHeading } from "../../../components/student-portal-ui";

export default function StudentExamsPage() {
  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="OLYMPIAD EXAMS" title="آزمون‌های من" description="آزمون‌های منتشرشده چکاد را ببین و اطلاعیه‌های شرکت در آن‌ها را دنبال کن." />
      <div className="student-portal-card student-exams-intro">
        <div className="student-exams-intro-art">◇</div>
        <div><span className="student-portal-eyebrow">EXAM CATALOG</span><h3>فهرست آزمون‌های چکاد</h3><p>در حال حاضر پنل آزمون، فهرست عمومی آزمون‌های منتشرشده را نمایش می‌دهد. ثبت‌نام دانش‌آموزی، پاسخ‌گویی آنلاین و کارنامه هنوز به این حساب متصل نشده است.</p><Link className="student-portal-button primary" href="/exams">مشاهده آزمون‌های منتشرشده</Link></div>
      </div>
      <PortalEmptyState icon="◇" title="هنوز آزمونی به حساب تو متصل نیست" description="پس از راه‌اندازی ثبت‌نام و نتایج آزمون، آزمون‌های فعال و کارنامه‌ها در همین بخش نمایش داده می‌شوند." />
    </div>
  );
}
