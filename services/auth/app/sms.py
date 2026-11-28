"""Small SMS gateway adapter used for student and guardian verification.

The HTTP adapter expects a JSON endpoint accepting {to, message, sender}
and an Authorization: Bearer <token> header. Production must configure an
HTTPS endpoint. The console adapter is development-only.
"""
import httpx

from app.config import settings


class SMSDeliveryError(RuntimeError):
    """Raised when an SMS cannot be handed to the configured provider."""


def send_sms(phone: str, message: str) -> None:
    provider = settings.sms_provider.lower().strip()

    if provider == "console":
        if settings.app_env.lower() == "production":
            raise SMSDeliveryError("Console SMS delivery is disabled in production.")
        print(f"[CHEKAD DEV SMS] to={phone} message={message}")
        return

    if provider != "http":
        raise SMSDeliveryError("No supported SMS provider is configured.")

    url = settings.sms_gateway_url.strip()
    token = settings.sms_gateway_token.get_secret_value()
    if not url or not token:
        raise SMSDeliveryError("SMS gateway settings are incomplete.")

    try:
        response = httpx.post(
            url,
            headers={"Authorization": f"Bearer {token}"},
            json={
                "to": phone,
                "message": message,
                "sender": settings.sms_sender_id or None,
            },
            timeout=8.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        # Never include the message body or OTP in raised/logged exceptions.
        raise SMSDeliveryError("SMS provider request failed.") from exc
