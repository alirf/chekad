import type { Metadata } from "next";
import { Breadcrumbs } from "../../../components/site-ui";
import { RequestForm } from "../../../components/request-form";

export const metadata: Metadata = {
  title: "درخواست منتورینگ",
  description: "فرم رابط کاربری درخواست منتورینگ تخصصی المپیاد فیزیک و کامپیوتر.",
};

export default function MentorshipApplyPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/mentorship", label: "منتورینگ" }, { label: "درخواست منتورینگ" }]} />
      <section className="request-section">
        <div className="container request-layout">
          <aside className="request-aside">
            <span className="eyebrow">START HERE</span>
            <h2>مسیرت را از همین‌جا روشن‌تر کن.</h2>
            <p>با چند پاسخ کوتاه، نیاز و هدف خود را برای همراهی در مسیر المپیاد مشخص می‌کنی. پس از فعال‌شدن سرویس ثبت درخواست، همین فرم به فرایند واقعی متصل می‌شود.</p>
            <ul className="feature-list">
              <li><span>✓</span>انتخاب رشته و سطح فعلی</li>
              <li><span>✓</span>توضیح هدف از دریافت منتورینگ</li>
              <li><span>✓</span>معرفی گزینه‌های متناسب برای انتخاب</li>
            </ul>
            <div className="notice-panel">
              <strong>نکته درباره نسخه فعلی فرم</strong>
              <p>این فرم هنوز به API ثبت درخواست متصل نیست. لطفاً فعلاً اطلاعات واقعی، اطلاعات تماس یا داده شخصی خود را وارد نکنید.</p>
            </div>
          </aside>
          <RequestForm kind="mentorship" />
        </div>
      </section>
    </main>
  );
}
