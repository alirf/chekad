const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPublicApplicationIntakeEnabled(): boolean {
  const enabled = process.env.PUBLIC_APPLICATIONS_ENABLED === "true";
  const privacyEmail = process.env.PRIVACY_CONTACT_EMAIL?.trim() ?? "";
  const siteOrigin = process.env.PUBLIC_SITE_ORIGIN?.trim() ?? "";

  if (!enabled || !EMAIL_PATTERN.test(privacyEmail)) return false;

  try {
    const origin = new URL(siteOrigin);
    return (
      origin.protocol === "https:" &&
      Boolean(origin.hostname) &&
      (origin.pathname === "/" || origin.pathname === "") &&
      !origin.search &&
      !origin.hash &&
      !origin.username &&
      !origin.password
    );
  } catch {
    return false;
  }
}
