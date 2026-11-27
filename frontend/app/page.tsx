import Link from "next/link";
import { OlympiadCard, SectionHeading, ServiceCard, CtaBanner, EmptyState } from "../components/site-ui";
import { RemotePeople } from "../components/remote-people";

const steps = [
  ["۰۱", "ثبت درخواست", "رشته، سطح و چیزی را که از همراهی تخصصی انتظار داری با ما در میان بگذار."],
  ["۰۲", "شناخت نیاز و پیشنهاد", "درخواست بررسی می‌شود تا گزینه‌های متناسب با مسیر و نیازت مشخص شوند."],
  ["۰۳", "انتخاب مشاور", "پس از دریافت پیشنهادها، فرصت داری مشاور مناسب خودت را انتخاب کنی."],
  ["۰۴", "گروه اختصاصی تلگرام", "یک گروه اختصاصی با حضور تو و مشاورت برای هماهنگی ارتباط تشکیل می‌شود."],
  ["۰۵", "برنامه‌ریزی و پیگیری", "گفت‌وگو، برنامه‌ریزی و پیگیری مسیر در همان گروه تلگرامی ادامه پیدا می‌کند."],
];

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero-section">
        <div className="hero-grid-pattern" aria-hidden="true" />
        <div className="container hero-layout">
          <div className="hero-content">
            <div className="hero-kicker"><span className="status-dot" /> همراه تخصصی مسیر المپیاد</div>
            <h1>مسیر المپیادت را<br /><span>آگاهانه</span> پیش ببر.</h1>
            <p className="hero-description">
              چکاد همراه دانش‌آموزان المپیاد فیزیک و کامپیوتر است؛ از برنامه‌ریزی و مشاوره تخصصی تا آزمون‌های آزمایشی و محتوای هدفمند.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/mentorship/apply">درخواست مشاوره <span aria-hidden="true">←</span></Link>
              <Link className="button button-ghost button-large" href="/exams">مشاهده آزمون‌ها <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="hero-trustline">
              <span className="trust-icon" aria-hidden="true">⌁</span>
              <span>تمرکز بر مسیر، نه صرفاً محتوای بیشتر</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="تصویرسازی انتزاعی از پیوند فیزیک و علوم کامپیوتر">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <div className="visual-orbit orbit-three" />
            <div className="visual-core"><span>چ</span><small>CHEKAD</small></div>
            <div className="visual-node node-physics"><span>∑</span><small>PHYSICS</small></div>
            <div className="visual-node node-code"><span>{"</>"}</span><small>COMPUTER</small></div>
            <div className="visual-node node-logic"><span>∴</span><small>THINK</small></div>
            <div className="visual-coordinate">35° 42′  N<br />51° 25′  E</div>
            <div className="visual-caption">THINK DEEPER. GO FURTHER.</div>
          </div>
        </div>
        <div className="hero-bottom-line"><div className="container"><span>PHYSICS</span><i /><span>COMPUTER SCIENCE</span><i /><span>OLYMPIAD PATH</span><b>01 / 04</b></div></div>
      </section>

      <section className="section section-white">
        <div className="container">
          <SectionHeading eyebrow="حوزه‌های تخصصی" title="دو مسیر، یک نگاه عمیق به حل مسئله" description="هر المپیاد دنیای خودش را دارد. چکاد خدمات تخصصی هر مسیر را با شناخت تفاوت‌های آن طراحی می‌کند." />
          <div className="olympiad-grid">
            <OlympiadCard field="physics" subtitle="PHYSICS OLYMPIAD" title="المپیاد فیزیک" description="برای ذهن‌هایی که می‌خواهند پدیده‌ها را از پایه بفهمند، مدل‌سازی کنند و با نگاه تحلیلی به مسئله برسند." href="/olympiads/physics" />
            <OlympiadCard field="computer" subtitle="COMPUTER SCIENCE OLYMPIAD" title="المپیاد کامپیوتر" description="برای علاقه‌مندان به الگوریتم، تفکر محاسباتی و ساختن راه‌حل‌های دقیق برای مسئله‌های پیچیده." href="/olympiads/computer" />
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHeading eyebrow="خدمات چکاد" title="برای هر مرحله از مسیر، یک همراهی متناسب" description="خدمات چکاد حول نیازهای واقعی دانش‌آموز المپیادی شکل گرفته‌اند؛ از داشتن مسیر روشن تا تمرین و سنجش." />
          <div className="services-grid">
            <ServiceCard number="۰۱" title="مشاوره و منتورینگ" description="در مسیر المپیاد تنها نمی‌مانی. با همراهی فردی باتجربه، برنامه‌ات را روشن‌تر می‌کنی و منظم‌تر پیش می‌روی." details="همراهی و هدایت · برنامه‌ریزی · پیگیری" href="/mentorship" linkLabel="آشنایی با منتورینگ" />
            <ServiceCard number="۰۲" title="آزمون‌های آزمایشی" description="با آزمون‌های تخصصی، آمادگی خودت را در شرایطی نزدیک به ارزیابی واقعی محک بزن." details="آزمون هدفمند · زمان‌بندی · آشنایی با فضای رقابت" href="/exams" linkLabel="دیدن آزمون‌ها" />
            <ServiceCard number="۰۳" title="کلاس خصوصی" description="برای آموزش عمیق یک مبحث یا رفع اشکال، با مدرس متناسب با نیاز علمی خودت ارتباط بگیر." details="آموزش تخصصی · حل تمرین · رفع اشکال" href="/tutoring" linkLabel="درخواست کلاس خصوصی" />
          </div>
        </div>
      </section>

      <section className="section section-white process-section">
        <div className="container">
          <div className="process-layout">
            <div className="process-intro">
              <span className="eyebrow">HOW IT WORKS</span>
              <h2>مشاوره در چکاد<br />چگونه پیش می‌رود؟</h2>
              <p>فرایند ساده و شفاف است. از ثبت درخواست تا انتخاب مشاور و ادامه همراهی، در هر قدم می‌دانی چه اتفاقی می‌افتد.</p>
              <Link href="/mentorship" className="text-link">جزئیات خدمت منتورینگ <span aria-hidden="true">←</span></Link>
              <div className="telegram-note">
                <span className="telegram-note-icon" aria-hidden="true">↗</span>
                <div><strong>ارتباط در تلگرام</strong><p>گروه اختصاصی فقط برای دانش‌آموز و مشاور تشکیل می‌شود؛ چکاد پیام‌رسان داخلی ندارد.</p></div>
              </div>
            </div>
            <div className="process-list">
              {steps.map((step, index) => (
                <div className="process-step" key={step[0]}>
                  <div className="process-marker"><span>{step[0]}</span>{index < steps.length - 1 ? <i /> : null}</div>
                  <div><h3>{step[1]}</h3><p>{step[2]}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-navy mentors-section">
        <div className="container">
          <div className="section-heading section-heading-split">
            <div><span className="eyebrow eyebrow-light">THE PEOPLE BEHIND THE PATH</span><h2>آدم‌های باتجربه،<br />کنار مسیر تو</h2></div>
            <p>پروفایل افراد فقط پس از ثبت و تأیید اطلاعات واقعی منتشر می‌شود. در این بخش، دستاورد یا سابقه تأییدنشده نمایش داده نخواهد شد.</p>
          </div>
          <RemotePeople kind="mentors" />
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-heading section-heading-split">
            <div><span className="eyebrow">UPCOMING EXAMS</span><h2>برای سنجش آمادگی</h2></div>
            <Link href="/exams" className="text-link">همه آزمون‌ها <span aria-hidden="true">←</span></Link>
          </div>
          <EmptyState title="آزمون فعالی برای ثبت‌نام منتشر نشده است" description="به‌محض نهایی‌شدن برنامه و اطلاعات آزمون‌ها، جزئیات ثبت‌نام در این بخش قرار می‌گیرد." icon="⌁" />
        </div>
      </section>

      <section className="section section-white">
        <div className="container">
          <div className="section-heading section-heading-split">
            <div><span className="eyebrow">CHEKAD JOURNAL</span><h2>فکرکردن را جدی بگیر.</h2><p>مجله تخصصی چکاد؛ جایی برای مسیرها، ایده‌ها و مسئله‌های المپیاد.</p></div>
            <Link href="/blog" className="text-link">ورود به مجله <span aria-hidden="true">←</span></Link>
          </div>
          <EmptyState title="اولین مقاله‌ها در راه‌اند" description="محتوا پس از آماده‌سازی و تأیید تحریریه منتشر می‌شود. مقاله یا خبر نمونه و ساختگی در سایت قرار نمی‌گیرد." icon="▤" />
        </div>
      </section>

      <CtaBanner title="برای مسیر المپیادت، یک همراه متخصص داشته باش." description="از شناخت نیازت شروع کن. درخواستت را ثبت کن تا مسیر همراهی مناسب بررسی شود." />
    </main>
  );
}
