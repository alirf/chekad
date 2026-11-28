"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchStudentInvoices, type StudentInvoice } from "../../../lib/student-auth";
import { formatPortalDate, PortalEmptyState, PortalPageHeading, PortalStatus } from "../../../components/student-portal-ui";

const serviceNames: Record<string, string> = { mentorship: "منتورینگ", tutoring: "کلاس خصوصی", other: "سایر خدمات" };
const money = (amount: number) => new Intl.NumberFormat("fa-IR").format(amount) + " تومان";

export default function StudentInvoicesPage() {
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchStudentInvoices()
      .then((result) => { if (active) setInvoices(result.items); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "دریافت فاکتورها انجام نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const summary = useMemo(() => ({
    total: invoices.filter((invoice) => invoice.status !== "void").reduce((sum, invoice) => sum + invoice.amount_toman, 0),
    paid: invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.amount_toman, 0),
    pending: invoices.filter((invoice) => invoice.status === "issued" || invoice.status === "overdue").reduce((sum, invoice) => sum + invoice.amount_toman, 0),
  }), [invoices]);

  return (
    <div className="student-portal-page">
      <PortalPageHeading eyebrow="PAYMENTS & INVOICES" title="فاکتورها" description="صورتحساب‌های صادرشده و وضعیت پرداخت خدمات چکاد را ببین." />
      {error && <div className="student-portal-alert error" role="alert">{error}</div>}
      <div className="student-invoice-summary">
        <div><span>مجموع فاکتورهای معتبر</span><strong>{loading ? "—" : money(summary.total)}</strong></div>
        <div><span>پرداخت‌شده</span><strong>{loading ? "—" : money(summary.paid)}</strong></div>
        <div><span>در انتظار پرداخت</span><strong>{loading ? "—" : money(summary.pending)}</strong></div>
      </div>
      <section className="student-portal-card">
        <div className="student-portal-card-heading"><span className="student-portal-eyebrow">MY INVOICES</span><h3>سوابق صورتحساب</h3><p>برای هر فاکتور، کد، مبلغ، مهلت و دستور پرداخت نمایش داده می‌شود.</p></div>
        {loading ? <div className="student-portal-loading compact">در حال دریافت فاکتورها...</div> : invoices.length ? (
          <div className="student-invoice-list">
            {invoices.map((invoice) => (
              <article className="student-invoice-item" key={invoice.id}>
                <div className="student-invoice-item-head"><div><strong>{invoice.title}</strong><small>{invoice.invoice_number} · {serviceNames[invoice.service_type] || "سایر خدمات"}</small></div><PortalStatus status={invoice.status} /></div>
                <div className="student-invoice-item-meta"><strong>{money(invoice.amount_toman)}</strong><span>صدور: {formatPortalDate(invoice.created_at)}</span><span>سررسید: {invoice.due_date ? formatPortalDate(invoice.due_date) : "تعیین نشده"}</span>{invoice.paid_at && <span>پرداخت: {formatPortalDate(invoice.paid_at)}</span>}</div>
                {invoice.description && <p>{invoice.description}</p>}
                {invoice.payment_instructions && invoice.status !== "paid" && invoice.status !== "void" && <div className="student-invoice-instructions"><b>راهنمای پرداخت:</b> {invoice.payment_instructions}</div>}
                {invoice.status === "paid" && <small className="student-invoice-paid-note">پرداخت این فاکتور در سامانه توسط تیم چکاد ثبت شده است.</small>}
              </article>
            ))}
          </div>
        ) : <PortalEmptyState icon="▤" title="هنوز فاکتوری برای حسابت صادر نشده" description="پس از صدور صورتحساب از طرف چکاد، جزئیات آن در این بخش نمایش داده می‌شود." />}
      </section>
      <p className="student-portal-muted">این نسخه دفتر ثبت فاکتور و پرداخت دستی است؛ هنوز درگاه پرداخت آنلاین به سامانه متصل نشده است. وضعیت پرداخت فقط پس از تأیید تیم چکاد تغییر می‌کند.</p>
    </div>
  );
}
