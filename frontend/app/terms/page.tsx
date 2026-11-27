import type { Metadata } from "next";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs, PageIntro } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "قوانین و مقررات",
  description: "اطلاع از وضعیت انتشار قوانین و مقررات استفاده از خدمات چکاد.",
};

export default function TermsPage() {
  return (
    <CmsPageOverride slug="terms">
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "قوانین و مقررات" }]} />
      <PageIntro eyebrow="TERMS" title="قوانین استفاده از خدمات" description="متن رسمی قوانین و شرایط خدمات چکاد پس از بررسی حقوقی در این صفحه منتشر خواهد شد." />
      <section className="content-section">
        <div className="container content-narrow legal-placeholder">
          <h2>نسخه نهایی هنوز منتشر نشده است</h2>
          <p>این صفحه تا زمان تصویب شرایط خدمات، متن حقوقی نهایی را ارائه نمی‌کند. پیش از فعال‌شدن ثبت درخواست یا پرداخت، ضوابط خدمت، شرایط لغو و بازپرداخت و مسئولیت طرفین باید به‌طور روشن اعلام شوند.</p>
        </div>
      </section>
    </main>
    </CmsPageOverride>
  );
}
