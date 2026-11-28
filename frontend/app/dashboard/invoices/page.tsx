import { PortalEmptyState, PortalPageHeading } from "../../../components/student-portal-ui";

export default function StudentInvoicesPage() {
  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="PAYMENTS & INVOICES" title="فاکتورها" description="صورتحساب‌ها و سوابق مالی خدمات خریداری‌شده را مدیریت کن." />
      <div className="student-portal-card student-invoice-summary">
        <div><span>فاکتورهای صادرشده</span><strong>—</strong></div>
        <div><span>مبلغ پرداخت‌شده</span><strong>—</strong></div>
        <div><span>مبلغ در انتظار پرداخت</span><strong>—</strong></div>
      </div>
      <PortalEmptyState icon="▤" title="زیرساخت صدور فاکتور هنوز فعال نشده است" description="در نسخه فعلی، سفارش، درگاه پرداخت و دفترکل مالی متصل به حساب دانش‌آموز وجود ندارد؛ بنابراین عدد یا فاکتور آزمایشی نمایش داده نمی‌شود." />
    </div>
  );
}
