import type { Metadata } from "next";
import { Breadcrumbs, CtaBanner, FaqList, FeatureList, PageIntro, SectionHeading } from "../../components/site-ui";
import { RemotePeople } from "../../components/remote-people";

export const metadata: Metadata = {
  title: "مشاوره و منتورینگ المپیاد",
  description: "با شناخت بهتر مسیر المپیاد، برنامه‌ریزی و همراهی فردی باتجربه، آگاهانه‌تر پیش برو.",
};

const faqs = [
  { question: "منتورینگ با کلاس خصوصی چه تفاوتی دارد؟", answer: "منتورینگ روی هدایت مسیر، برنامه‌ریزی، پیگیری و گفت‌وگو درباره روند پیشرفت تمرکز دارد. کلاس خصوصی برای آموزش یک مبحث علمی، حل تمرین و رفع اشکال تخصصی است." },
  { question: "چطور مشاور مناسبم را انتخاب می‌کنم؟", answer: "پس از ثبت درخواست، نیاز و شرایطت بررسی می‌شود و گزینه‌های مناسب معرفی می‌شوند. انتخاب نهایی مشاور با خود دانش‌آموز است." },
  { question: "ارتباط من با مشاور از چه طریقی انجام می‌شود؟", answer: "برای هر دانش‌آموز یک گروه اختصاصی تلگرام با حضور همان دانش‌آموز و مشاور تشکیل می‌شود. چکاد پیام‌رسان داخلی یا تماس تصویری داخلی ارائه نمی‌کند." },
  { question: "آیا ساختار جلسات و هزینه مشخص شده است؟", answer: "جزئیات بسته، تعداد و زمان جلسات و هزینه پس از نهایی‌شدن شرایط همکاری اعلام می‌شود. اطلاعات پیشنهادی داخلی تا زمان تأیید نهایی، تعهد عمومی محسوب نمی‌شوند." },
];

export default function MentorshipPage() {
  return (
    <main id="main-content">
      <Breadcrumbs items={[{ href: "/", label: "خانه" }, { label: "مشاوره و منتورینگ" }]} />
      <PageIntro eyebrow="MENTORSHIP" title="در مسیر المپیاد، فقط بیشتر نخوان؛ هوشمندانه‌تر پیش برو." description="منتورینگ چکاد برای ساختن یک مسیر روشن‌تر است؛ همراهی فردی باتجربه که کمک می‌کند هدف‌ها، برنامه و قدم بعدی را بهتر بشناسی." >
        <a className="button button-primary" href="/mentorship/apply">درخواست منتورینگ <span aria-hidden="true">←</span></a>
        <Link className="button button-secondary" href="#how-it-works">فرایند همکاری</a>
      </PageIntro>

      <section className="content-section">
        <div className="container split-content">
          <div className="prose">
            <span className="eyebrow">A BETTER WAY FORWARD</span>
            <h2>همراهی برای تصمیم‌های مهم مسیر</h2>
            <p>مسیر المپیاد فقط به دانستن مطالب محدود نمی‌شود. انتخاب اولویت‌ها، مدیریت زمان، حفظ پیوستگی و تشخیص قدم بعدی هم بخشی از این مسیرند.</p>
            <p>منتور در چکاد قرار نیست جای دانش‌آموز درس بخواند یا صرفاً محتوای آموزشی ارائه کند؛ نقش او همراهی، پرسیدن سؤال‌های درست و کمک به منظم‌شدن مسیر است.</p>
          </div>
          <div>
            <FeatureList items={["شناخت وضعیت و هدف فعلی دانش‌آموز", "برنامه‌ریزی متناسب با شرایط و اولویت‌ها", "گفت‌وگو و بررسی روند پیشرفت", "دسترسی به فرد باتجربه در مسیر المپیاد", "ارتباط مستمر در گروه اختصاصی تلگرام"]} />
          </div>
        </div>
      </section>

      <section className="content-section content-section-soft" id="how-it-works">
        <div className="container">
          <SectionHeading eyebrow="THE PROCESS" title="از درخواست تا همراهی، پنج قدم روشن" description="دانش‌آموز در انتخاب مشاور نقش مستقیم دارد و مسیر ارتباط از ابتدا شفاف است." />
          <div className="process-list">
            {[
              ["۰۱", "ثبت درخواست", "رشته، پایه، سطح و هدف خود را در فرم درخواست مشخص می‌کنی."],
              ["۰۲", "بررسی نیاز", "تیم چکاد اطلاعات درخواست را بررسی و گزینه‌های مناسب را مشخص می‌کند."],
              ["۰۳", "معرفی و انتخاب مشاور", "مشاوران پیشنهادی معرفی می‌شوند و تو انتخاب نهایی را انجام می‌دهی."],
              ["۰۴", "گروه اختصاصی تلگرام", "گروهی با حضور دانش‌آموز و مشاور در تلگرام تشکیل می‌شود."],
              ["۰۵", "برنامه‌ریزی و پیگیری", "هماهنگی جلسات و پیگیری مسیر در همان گروه انجام می‌شود."],
            ].map((step, index) => (
              <div className="process-step" key={step[0]}>
                <div className="process-marker"><span>{step[0]}</span>{index < 4 ? <i /> : null}</div>
                <div><h3>{step[1]}</h3><p>{step[2]}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <SectionHeading eyebrow="OUR MENTORS" title="مشاوران و همراهان چکاد" description="اطلاعات افراد پس از تأیید سوابق و انتشار عمومی در این بخش نمایش داده می‌شود." />
          <RemotePeople kind="mentors" />
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <SectionHeading eyebrow="FAQ" title="پرسش‌های متداول" />
          <FaqList items={faqs} />
        </div>
      </section>
      <CtaBanner title="از یک گفت‌وگوی درست شروع کن." description="درخواستت را ثبت کن تا نیازت بررسی شود و مسیر همراهی مناسب پیشنهاد شود." />
    </main>
  );
}
