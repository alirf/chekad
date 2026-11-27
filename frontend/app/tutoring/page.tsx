import type { Metadata } from "next";
import { Breadcrumbs, CtaBanner, FaqList, FeatureList, PageIntro, SectionHeading } from "../../components/site-ui";
import { RemotePeople } from "../../components/remote-people";
import { RequestForm } from "../../components/request-form";

export const metadata: Metadata = {
  title: "کلاس خصوصی المپیاد",
  description: "درخواست کلاس خصوصی و آموزش تخصصی مباحث المپیاد فیزیک و کامپیوتر.",
};

const faqs = [
  { question: "کلاس خصوصی چه تفاوتی با منتورینگ دارد؟", answer: "کلاس خصوصی روی یادگیری مباحث، حل مسئله و رفع اشکال علمی تمرکز دارد. منتورینگ برای برنامه‌ریزی، هدایت و پیگیری مسیر المپیاد است." },
  { question: "چه رشته‌هایی پوشش داده می‌شوند؟", answer: "در فاز فعلی، خدمات چکاد روی المپیاد فیزیک و المپیاد کامپیوتر متمرکز است." },
  { question: "آیا مدرس را خودم انتخاب می‌کنم؟", answer: "پس از بررسی نیاز آموزشی، اطلاعات مدرسان متناسب در اختیار دانش‌آموز قرار می‌گیرد تا انتخاب آگاهانه‌تری داشته باشد." },
];

export default function TutoringPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "کلاس خصوصی" }]} />
      <PageIntro eyebrow="PRIVATE TUTORING" title="برای یک مبحث دشوار، آموزش دقیق و متمرکز." description="کلاس خصوصی چکاد برای زمانی است که به آموزش تخصصی، حل تمرین یا رفع اشکال در مباحث المپیاد نیاز داری." >
        <a className="button button-primary" href="#request">درخواست کلاس خصوصی <span aria-hidden="true">←</span></a>
      </PageIntro>
      <section className="content-section">
        <div className="container split-content">
          <div className="prose">
            <span className="eyebrow">FOCUSED LEARNING</span>
            <h2>یک نیاز علمی مشخص؛ یک مسیر آموزشی متناسب</h2>
            <p>گاهی برای عبور از یک مبحث، به گفت‌وگوی مستقیم با مدرس متخصص و فرصت کافی برای حل مسئله نیاز داری. در کلاس خصوصی، تمرکز روی موضوعی است که خودت برای یادگیری یا رفع اشکال مشخص می‌کنی.</p>
            <p>این خدمت مستقل از منتورینگ ارائه می‌شود و هدف آن آموزش علمی است، نه پیگیری برنامه کلی المپیاد.</p>
          </div>
          <FeatureList items={["آموزش مباحث فیزیک و کامپیوتر", "رفع اشکال و بررسی راه‌حل‌ها", "تمرین و تعمیق درک مفهومی", "تناسب مدرس با نیاز تخصصی", "امکان توضیح هدف و موضوع پیش از هماهنگی"]} />
        </div>
      </section>
      <section className="content-section content-section-soft">
        <div className="container">
          <SectionHeading eyebrow="TUTORS" title="مدرسان تخصصی" description="فهرست مدرسان از سرویس افراد دریافت می‌شود و فقط پروفایل‌های عمومی منتشرشده نمایش داده می‌شوند." />
          <RemotePeople kind="tutors" />
        </div>
      </section>
      <section className="content-section" id="request">
        <div className="container request-layout">
          <div className="request-aside">
            <span className="eyebrow">YOUR LEARNING NEED</span>
            <h2>موضوعی که می‌خواهی بهتر بفهمی چیست؟</h2>
            <p>رشته و موضوع آموزشی موردنیازت را مشخص کن تا فرایند درخواست کلاس خصوصی پس از فعال‌شدن API تکمیل شود.</p>
            <div className="notice-panel"><strong>ثبت درخواست غیرفعال است</strong><p>فرم در این نسخه فقط رابط کاربری و اعتبارسنجی اولیه دارد و اطلاعاتی به سرور ارسال نمی‌کند.</p></div>
          </div>
          <RequestForm kind="tutoring" />
        </div>
      </section>
      <section className="faq-section">
        <div className="container"><SectionHeading eyebrow="FAQ" title="پرسش‌های متداول" /><FaqList items={faqs} /></div>
      </section>
      <CtaBanner title="یادگیری یک مبحث را جدی‌تر دنبال کن." description="نیاز آموزشی‌ات را مشخص کن و پس از فعال‌شدن ثبت درخواست، فرایند انتخاب مدرس را ادامه بده." href="/tutoring#request" buttonLabel="درخواست کلاس خصوصی" />
    </main>
  );
}
