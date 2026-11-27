import type { Metadata } from "next";
import { Breadcrumbs } from "../../../components/site-ui";
import { RequestForm } from "../../../components/request-form";
import { isPublicApplicationIntakeEnabled } from "../../../lib/public-intake";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "درخواست منتورینگ",
  description: "ثبت درخواست منتورینگ تخصصی المپیاد فیزیک و کامپیوتر.",
};

export default function MentorshipApplyPage() {
  const intakeEnabled = isPublicApplicationIntakeEnabled();

  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/mentorship", label: "منتورینگ" }, { label: "درخواست منتورینگ" }]} />
      <section className="request-section">
        <div className="container request-layout">
          <aside className="request-aside">
            <span className="eyebrow">START HERE</span>
            <h2>مسیرت را از همین‌جا روشن‌تر کن.</h2>
            <p>با چند پاسخ کوتاه، نیاز و هدف خود را برای همراهی در مسیر المپیاد مشخص می‌کنی. پس از ثبت درخواست، تیم چکاد برای بررسی و پیگیری با سرپرست تماس می‌گیرد.</p>
            <ul className="feature-list">
              <li><span>✓</span>انتخاب رشته و سطح فعلی</li>
              <li><span>✓</span>توضیح هدف از دریافت منتورینگ</li>
              <li><span>✓</span>معرفی گزینه‌های متناسب برای انتخاب</li>
            </ul>
            <div className="notice-panel">
              <strong>ویژه دانش‌آموزان زیر ۱۸ سال</strong>
              <p>در نسخه فعلی، فرم توسط ولی یا سرپرست تکمیل می‌شود. شماره تماس سرپرست دریافت می‌شود، نه شماره شخصی دانش‌آموز.</p>
            </div>
          </aside>
          <RequestForm kind="mentorship" enabled={intakeEnabled} />
        </div>
      </section>
    </main>
  );
}
