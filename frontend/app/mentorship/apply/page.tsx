import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "../../../components/site-ui";
import { RequestForm } from "../../../components/request-form";
import { isPublicApplicationIntakeEnabled } from "../../../lib/public-intake";
import "./apply.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "درخواست منتورینگ | چکاد",
  description: "برای دریافت راهنمایی و همراهی در مسیر المپیاد فیزیک یا کامپیوتر، درخواست منتورینگ خود را ثبت کنید.",
};

export default function MentorshipApplyPage() {
  const intakeEnabled = isPublicApplicationIntakeEnabled();

  return (
    <main id="main-content" className="mentorship-apply-page">
      <div className="apply-top">
        <div className="container">
          <Breadcrumbs items={[{ href: "/", label: "خانه" }, { href: "/mentorship", label: "منتورینگ" }, { label: "ثبت درخواست" }]} />
          <div className="apply-hero">
            <div className="apply-hero-copy">
              <span className="apply-kicker"><i /> قدم اول برای همراهی تخصصی</span>
              <h1>برای مسیر المپیادت، <em>همراه مناسب</em> پیدا کن.</h1>
              <p>چند سؤال کوتاه را پاسخ بده تا با شناخت بهتر هدف و شرایطت، درخواست منتورینگت را بررسی کنیم و برای انتخاب همراه مناسب راهنمایی‌ات کنیم.</p>
              <div className="apply-hero-actions">
                <a className="apply-primary" href="#application-form">تکمیل فرم درخواست <span>←</span></a>
                <a className="apply-secondary" href="https://t.me/alirf11" target="_blank" rel="noreferrer">پرسش در تلگرام</a>
              </div>
              <div className="apply-trust"><span>✓</span> ثبت درخواست رایگان است و پیش از شروع همکاری، جزئیات با شما هماهنگ می‌شود.</div>
            </div>
            <div className="apply-visual" aria-hidden="true">
              <div className="apply-orbit apply-orbit-a" />
              <div className="apply-orbit apply-orbit-b" />
              <div className="apply-visual-core"><b>چ</b><span>CHEKAD</span></div>
              <div className="apply-visual-node apply-node-one"><b>01</b><span>شناخت نیاز</span></div>
              <div className="apply-visual-node apply-node-two"><b>02</b><span>انتخاب همراه</span></div>
              <div className="apply-visual-node apply-node-three"><b>03</b><span>شروع مسیر</span></div>
            </div>
          </div>
        </div>
      </div>

      <section className="apply-content">
        <div className="container apply-layout">
          <aside className="apply-sidebar">
            <span className="apply-section-label">چطور پیش می‌رویم؟</span>
            <h2>از درخواست تا شروع همراهی</h2>
            <p>فرایند ساده است؛ ابتدا نیازت را می‌شناسیم و بعد برای انتخاب منتور مناسب با تو و خانواده‌ات هماهنگ می‌شویم.</p>
            <ol className="apply-steps">
              <li><span>۱</span><div><b>ثبت اطلاعات</b><small>رشته، سطح و هدف آموزشی را مشخص کن.</small></div></li>
              <li><span>۲</span><div><b>بررسی درخواست</b><small>تیم چکاد درخواست را بررسی می‌کند.</small></div></li>
              <li><span>۳</span><div><b>هماهنگی و انتخاب</b><small>درباره گزینه‌های مناسب و ادامه مسیر گفت‌وگو می‌کنیم.</small></div></li>
            </ol>
            <div className="apply-contact-card">
              <span>نیاز به راهنمایی داری؟</span>
              <a href="tel:09918891553" dir="ltr">09918891553</a>
              <a href="https://t.me/alirf11" target="_blank" rel="noreferrer">@alirf11 در تلگرام</a>
            </div>
          </aside>

          <div id="application-form" className="apply-form-column">
            <div className="apply-form-heading">
              <span className="apply-section-label">فرم درخواست</span>
              <h2>اطلاعات اولیه را وارد کن</h2>
              <p>فرم را در دو مرحله تکمیل می‌کنی. اطلاعات تماس برای پیگیری درخواست استفاده می‌شود.</p>
            </div>
            <RequestForm kind="mentorship" enabled={intakeEnabled} />
          </div>
        </div>
      </section>
      <section className="apply-bottom">
        <div className="container">
          <p>هنوز مطمئن نیستی منتورینگ برایت مناسب است؟</p>
          <Link href="/mentorship">با خدمات منتورینگ چکاد بیشتر آشنا شو <span>←</span></Link>
        </div>
      </section>
    </main>
  );
}
