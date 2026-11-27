import type { Metadata } from "next";
import { Breadcrumbs, PageIntro } from "../../components/site-ui";

export const metadata: Metadata = {
  title: "حریم خصوصی",
  description: "اطلاع درباره وضعیت پردازش اطلاعات در نسخه فعلی وب‌سایت چکاد.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "حریم خصوصی" }]} />
      <PageIntro eyebrow="PRIVACY" title="حریم خصوصی و اطلاعات کاربران" description="حفظ حریم خصوصی دانش‌آموزان و خانواده‌ها بخشی از طراحی خدمات چکاد است." />
      <section className="content-section">
        <div className="container content-narrow prose">
          <h2>وضعیت نسخه فعلی</h2>
          <p>فرم‌های منتورینگ و کلاس خصوصی در این نسخه فقط رابط کاربری و اعتبارسنجی اولیه دارند. این فرم‌ها اطلاعات واردشده را به سرور ارسال یا در پایگاه داده ذخیره نمی‌کنند.</p>
          <p>تا زمان اتصال امن API و انتشار سیاست نهایی، اطلاعات شخصی، شناسه تماس یا اطلاعات حساس را در فرم‌ها وارد نکنید.</p>
          <p>متن نهایی سیاست حریم خصوصی، شامل نوع داده‌های جمع‌آوری‌شده، هدف پردازش، مدت نگهداری، اشخاص دارای دسترسی و روش درخواست حذف اطلاعات، پیش از فعال‌سازی فرم‌ها باید تکمیل و منتشر شود.</p>
        </div>
      </section>
    </main>
  );
}
