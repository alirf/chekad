const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_PATTERN = /^[A-Za-z0-9_]{5,32}$/;
const IRAN_MOBILE_PATTERN = /^(?:\+98|0)?9\d{9}$/;

function hasPublicPrivacyContact(): boolean {
  const email = process.env.PRIVACY_CONTACT_EMAIL?.trim() ?? "";
  const phone = (process.env.PRIVACY_CONTACT_PHONE ?? "").replace(/[\s()-]/g, "");
  const telegram = (process.env.PRIVACY_CONTACT_TELEGRAM ?? "").trim().replace(/^@/, "");
  return (
    EMAIL_PATTERN.test(email) ||
    IRAN_MOBILE_PATTERN.test(phone) ||
    TELEGRAM_PATTERN.test(telegram)
  );
}

function isAllowedPublicOrigin(value: string): boolean {
  try {
    const origin = new URL(value);
    const validShape =
      Boolean(origin.hostname) &&
      (origin.pathname === "/" || origin.pathname === "") &&
      !origin.search &&
      !origin.hash &&
      !origin.username &&
      !origin.password;

    if (!validShape) return false;
    if (origin.protocol === "https:") return true;

    const localDevelopment =
      process.env.APP_ENV !== "production" &&
      origin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(origin.hostname);

    return localDevelopment;
  } catch {
    return false;
  }
}

export function isPublicApplicationIntakeEnabled(): boolean {
  const enabled = process.env.PUBLIC_APPLICATIONS_ENABLED === "true";
  const termsApproved = process.env.TERMS_APPROVED === "true";
  const siteOrigin = process.env.PUBLIC_SITE_ORIGIN?.trim() ?? "";

  return enabled && termsApproved && hasPublicPrivacyContact() && isAllowedPublicOrigin(siteOrigin);
}
