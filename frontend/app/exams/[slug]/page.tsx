import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, EmptyState } from "../../../components/site-ui";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "جزئیات آزمون",
    description: "اطلاعات آزمون آزمایشی المپیاد در چکاد.",
  };
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length > 120) notFound();

  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/exams", label: "آزمون‌ها" }, { label: "جزئیات آزمون" }]} />
      <section className="content-section">
        <div className="container content-narrow">
          <span className="eyebrow">EXAM DETAILS</span>
          <h1 className="section-heading">اطلاعات آزمون</h1>
          <EmptyState title="جزئیات این آزمون هنوز منتشر نشده است" description="برای این نشانی، اطلاعات آزمون تأییدشده‌ای در backend موجود نیست. عنوان، تاریخ، هزینه یا وضعیت ثبت‌نام حدس زده نمی‌شود." icon="⌁" />
        </div>
      </section>
    </main>
  );
}
