import type { Metadata } from "next";
import { CmsPageOverride } from "../../components/cms-page-override";
import { Breadcrumbs } from "../../components/site-ui";
import "./contact.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تماس با چکاد | راه‌های ارتباطی",
  description: "برای پرسش درباره خدمات، پیگیری درخواست یا موضوعات حریم خصوصی با چکاد در ارتباط باش.",
};

function getContactDetails() {
  const rawPhone = process.env.PRIVACY_CONTACT_PHONE?.trim() || "09918891553";
  const phone = /^[+\d\s()\-]{8,20}$/.test(rawPhone) ? rawPhone : "09918891553";
  const phoneHref = phone.replace(/[^+\d]/g, "");

  const rawTelegram = process.env.PRIVACY_CONTACT_TELEGRAM?.trim() || "alirf11";
  const telegramMatch = rawTelegram.match(/^@?([A-Za-z0-9_]{5,32})$/);
  const telegram = telegramMatch?.[1] || "alirf11";

  const rawEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim() || "";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : "";

  return { phone, phoneHref, telegram, email };
}

export default function ContactPage() {
  const { phone, phoneHref, telegram, email } = getContactDetails();

  return (
    <CmsPageOverride slug="contact">
      <main id="main-content" className="contact-page">
        <section className="contact-hero">
          <div className="contact-hero-grid" aria-hidden="true" />
          <div className="container">
            <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "تماس با چکاد" }]} />
            <div className="contact-hero-content">
              <span className="contact-kicker"><i /> همراهت هستیم</span>
              <h1>برای قدم بعدی،<br /><em>با ما در ارتباط باش.</em></h1>
              <p>درباره خدمات چکاد سؤالی داری، می‌خواهی درخواستت را پیگیری کنی یا موضوعی درباره اطلاعات شخصی‌ات مطرح کنی؟ از راه‌های زیر با ما تماس بگیر.</p>
              <a className="contact-hero-link" href={"https://t.me/" + telegram} target="_blank" rel="noreferrer">
                گفت‌وگو در تلگرام <span aria-hidden="true">←</span>
              </a>
            </div>
            <div className="contact-hero-art" aria-hidden="true">
              <div className="contact-orbit contact-orbit-one" />
              <div className="contact-orbit contact-orbit-two" />
              <div className="contact-hero-mark"><b>چ</b><span>CHEKAD</span></div>
              <i className="contact-spark contact-spark-one" />
              <i className="contact-spark contact-spark-two" />
              <i className="contact-spark contact-spark-three" />
            </div>
          </div>
        </section>

        <section className="contact-content">
          <div className="container">
            <header className="contact-heading">
              <span>CONTACT CHANNELS</span>
              <h2>از راهی که برایت راحت‌تر است پیام بده.</h2>
              <p>برای شروع گفت‌وگو یا پیگیری موضوعت، یکی از راه‌های ارتباطی فعال را انتخاب کن.</p>
            </header>

            <div className="contact-method-grid">
              <article className="contact-method-card contact-method-phone">
                <div className="contact-method-top"><span className="contact-method-icon">☎</span><small>CALL US</small></div>
                <h3>تماس تلفنی</h3>
                <p>برای گفت‌وگو و پرسش‌های عمومی درباره خدمات چکاد.</p>
                <a className="contact-method-action" href={"tel:" + phoneHref} dir="ltr">{phone} <span>←</span></a>
              </article>

              <article className="contact-method-card contact-method-telegram">
                <div className="contact-method-top"><span className="contact-method-icon">↗</span><small>TELEGRAM</small></div>
                <h3>پیام در تلگرام</h3>
                <p>برای نوشتن پیام، توضیح موضوع و ارسال پرسش‌ها.</p>
                <a className="contact-method-action" href={"https://t.me/" + telegram} target="_blank" rel="noreferrer" dir="ltr">@{telegram} <span>←</span></a>
              </article>

              {email ? (
                <article className="contact-method-card contact-method-email">
                  <div className="contact-method-top"><span className="contact-method-icon">✉</span><small>EMAIL</small></div>
                  <h3>ایمیل</h3>
                  <p>برای مکاتبه و موضوعاتی که بهتر است مکتوب ارسال شوند.</p>
                  <a className="contact-method-action contact-email-value" href={"mailto:" + email} dir="ltr">{email} <span>←</span></a>
                </article>
              ) : null}
            </div>

            <div className="contact-lower-grid">
              <section className="contact-follow-card">
                <span className="contact-card-kicker">REQUEST FOLLOW-UP</span>
                <div className="contact-card-icon">⌕</div>
                <h2>درخواستت را قبلاً ثبت کرده‌ای؟</h2>
                <p>برای دیدن کد پیگیری و آخرین وضعیت درخواست منتورینگ یا کلاس خصوصی، وارد حساب دانش‌آموزی شو.</p>
                <a href="/dashboard">رفتن به پنل دانش‌آموزی <b>←</b></a>
              </section>

              <section className="contact-topics-card">
                <span className="contact-card-kicker">HOW CAN WE HELP?</span>
                <h2>برای چه موضوعی پیام بدهی؟</h2>
                <div className="contact-topic"><span>۰۱</span><div><b>منتورینگ و کلاس خصوصی</b><p>پرسش درباره ثبت درخواست، انتخاب همراه یا هماهنگی کلاس.</p></div></div>
                <div className="contact-topic"><span>۰۲</span><div><b>حساب و پیگیری درخواست</b><p>راهنمایی درباره ورود به حساب یا مشاهده وضعیت درخواست.</p></div></div>
                <div className="contact-topic"><span>۰۳</span><div><b>حریم خصوصی</b><p>پرسش درباره اطلاعاتی که در سایت ثبت کرده‌ای.</p></div></div>
                <a className="contact-privacy-link" href="/privacy">مطالعه اطلاعیه حریم خصوصی <b>←</b></a>
              </section>
            </div>

            <div className="contact-note">
              <span>یک یادآوری کوچک</span>
              <p>برای حفظ حریم خصوصی، اطلاعات حساس مثل رمز عبور، کدهای ورود یا اطلاعات هویتی غیرضروری را در پیام‌ها ارسال نکن. اگر درخواست آموزشی ثبت کرده‌ای، کد پیگیری برای پیدا کردن سریع‌تر آن مفید است.</p>
            </div>
          </div>
        </section>
      </main>
    </CmsPageOverride>
  );
}
