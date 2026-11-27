import type { Metadata } from "next";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs, PageIntro } from "../../components/site-ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تماس با چکاد",
  description: "راه‌های ارتباطی رسمی و مسئول حریم خصوصی چکاد.",
};

export default function ContactPage() {
  const privacyCandidate = process.env.PRIVACY_CONTACT_EMAIL?.trim() ?? "";
  const privacyEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyCandidate) ? privacyCandidate : "";

  return (
    <CmsPageOverride slug="contact">
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "تماس با چکاد" }]} />
      <PageIntro eyebrow="CONTACT" title="در ارتباط باشیم." description="برای پیگیری درخواست و پرسش‌های مرتبط با اطلاعات شخصی، از راه ارتباطی رسمی تنظیم‌شده توسط چکاد استفاده کنید." />
      <section className="content-section">
        <div className="container content-narrow">
          {privacyEmail ? (
            <div className="privacy-contact">
              <strong>مسئول حریم خصوصی و پیگیری درخواست‌ها</strong>
              <a href={"mailto:" + privacyEmail}>{privacyEmail}</a>
            </div>
          ) : (
            <div className="legal-placeholder">
              <h2>راه ارتباطی رسمی هنوز تنظیم نشده است</h2>
              <p>نشانی ایمیل یا شماره تماس تأییدشده‌ای برای انتشار عمومی در تنظیمات استقرار ثبت نشده است. تا زمان ثبت یک راه ارتباطی فعال، فرم‌های عمومی دریافت اطلاعات را آغاز نمی‌کنند.</p>
            </div>
          )}
        </div>
      </section>
    </main>
    </CmsPageOverride>
  );
}
