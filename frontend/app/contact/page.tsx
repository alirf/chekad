import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "تماس با چکاد",
  description: "راه‌های ارتباطی و پیگیری درخواست‌های چکاد.",
};

export default function ContactPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "تماس با چکاد" }]} />
      <PageIntro eyebrow="CONTACT" title="در ارتباط باشیم." description="راه‌های ارتباطی رسمی چکاد پس از تأیید و ثبت اطلاعات در این صفحه منتشر می‌شوند." />
      <section className="content-section">
        <div className="container content-narrow">
          <div className="legal-placeholder">
            <h2>اطلاعات تماس در حال تکمیل است</h2>
            <p>در حال حاضر نشانی ایمیل، شماره تماس یا حساب شبکه اجتماعی تأییدشده‌ای برای انتشار عمومی در اطلاعات پروژه ثبت نشده است؛ بنابراین از نمایش اطلاعات حدسی خودداری می‌کنیم.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
