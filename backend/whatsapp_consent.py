"""
VITALIS — Twilio WhatsApp consent + report delivery (auditable store).

Env:
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
  TWILIO_WHATSAPP_FROM or TWILIO_WHATSAPP_NUMBER (e.g. whatsapp:+14155238886)
  TWILIO_WEBHOOK_PUBLIC_URL or WEBHOOK_URL — exact public URL Twilio POSTs to
  WHATSAPP_DATA_DIR — optional directory for JSON persistence (default: backend/data)
  TWILIO_SKIP_SIGNATURE_VALIDATION=1 — dev only; never in production
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from collections import deque
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import gettempdir
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from twilio.request_validator import RequestValidator
from twilio.rest import Client

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

_lock = asyncio.Lock()

CONSENT_MESSAGE = (
    "Hi 👋 Is this your WhatsApp number? VITALIS wants permission to share your health report. "
    "Reply YES to continue."
)

MAX_REPORT_CHARS = 3800
CONSENT_TTL = timedelta(hours=24)
MAX_AUDIT = 500


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _digits_only(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def normalize_to_e164_india(phone: str) -> str | None:
    """
    E.164 validation for India: +91 followed by 10 digits starting 6–9.
    Also accepts 10-digit national or 12-digit 91… without +.
    """
    raw = (phone or "").strip()
    if raw.startswith("+"):
        d = _digits_only(raw[1:])
        if len(d) == 12 and d.startswith("91") and d[2] in "6789":
            return f"+{d}"
        return None
    d = _digits_only(raw)
    if len(d) == 10 and d[0] in "6789":
        return f"+91{d}"
    if len(d) == 12 and d.startswith("91") and d[2] in "6789":
        return f"+{d}"
    if len(d) == 11 and d.startswith("0"):
        return normalize_to_e164_india(d[1:])
    return None


def wa_address(e164: str) -> str:
    d = e164 if e164.startswith("+") else f"+{_digits_only(e164)}"
    return f"whatsapp:{d}"


def parse_twilio_whatsapp_from(raw: str) -> str | None:
    if not raw:
        return None
    s = raw.strip()
    if s.lower().startswith("whatsapp:"):
        inner = s.split(":", 1)[1].strip()
        if inner.startswith("+"):
            return inner
        digits = _digits_only(inner)
        if digits:
            return f"+{digits}"
    return None


def _is_yes(body: str) -> bool:
    b = (body or "").strip().casefold()
    if not b:
        return False
    if b in ("yes", "y"):
        return True
    parts = b.split()
    return bool(parts) and parts[0] == "yes"


def _is_no(body: str) -> bool:
    b = (body or "").strip().casefold()
    if not b:
        return False
    return b == "no" or b.split()[0] in ("no", "nope", "stop", "cancel")


ConsentStatus = Literal["PENDING", "CONSENTED", "REPORT_SENT", "FAILED", "DECLINED", "EXPIRED"]
MsgDirection = Literal["INBOUND", "OUTBOUND"]


@dataclass
class ConsentRequest:
    id: str
    phone_e164: str
    status: ConsentStatus
    report_text: str
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)
    consent_message_sid: str | None = None
    report_message_sid: str | None = None
    last_error: str | None = None


@dataclass
class MessageLogEntry:
    id: str
    direction: MsgDirection
    to_addr: str
    from_addr: str
    body_preview: str
    timestamp: datetime
    consent_request_id: str | None = None
    twilio_message_sid: str | None = None


_consent_by_id: dict[str, ConsentRequest] = {}
_pending_by_digits: dict[str, str] = {}
_audit: deque[MessageLogEntry] = deque(maxlen=MAX_AUDIT)


def _store_path() -> Path:
    base = os.getenv("WHATSAPP_DATA_DIR", "").strip()
    if base:
        return Path(base).resolve() / "whatsapp_store.json"

    # Serverless bundles often run from read-only /var/task (AWS Lambda)
    # or similar environments (Vercel). Fallback to tmp in those cases.
    is_serverless = bool(
        os.getenv("AWS_LAMBDA_FUNCTION_NAME")
        or os.getenv("AWS_EXECUTION_ENV")
        or os.getenv("LAMBDA_TASK_ROOT")
        or os.getenv("VERCEL")
    )
    try:
        is_serverless = is_serverless or str(Path(__file__).resolve()).startswith("/var/task")
    except Exception:  # noqa: BLE001
        pass

    if is_serverless:
        return Path(gettempdir()).resolve() / "vitalis-whatsapp" / "whatsapp_store.json"

    return Path(__file__).resolve().parent / "data" / "whatsapp_store.json"


def _serialize_dt(dt: datetime) -> str:
    return dt.isoformat()


def _parse_dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def _persist_snapshot() -> None:
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "consents": [
            {
                **{k: v for k, v in asdict(c).items() if k not in ("created_at", "updated_at")},
                "created_at": _serialize_dt(c.created_at),
                "updated_at": _serialize_dt(c.updated_at),
            }
            for c in _consent_by_id.values()
        ],
        "pending_by_digits": dict(_pending_by_digits),
        "audit": [
            {
                **{k: v for k, v in asdict(a).items() if k != "timestamp"},
                "timestamp": _serialize_dt(a.timestamp),
            }
            for a in list(_audit)
        ],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_snapshot() -> None:
    path = _store_path()
    if not path.is_file():
        return
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return
    consents = raw.get("consents") or []
    for item in consents:
        try:
            c = ConsentRequest(
                id=str(item["id"]),
                phone_e164=str(item["phone_e164"]),
                status=str(item["status"]),
                report_text=str(item["report_text"]),
                created_at=_parse_dt(str(item["created_at"])),
                updated_at=_parse_dt(str(item["updated_at"])),
                consent_message_sid=item.get("consent_message_sid"),
                report_message_sid=item.get("report_message_sid"),
                last_error=item.get("last_error"),
            )
            _consent_by_id[c.id] = c
        except (KeyError, TypeError, ValueError):
            continue
    pending = raw.get("pending_by_digits") or {}
    if isinstance(pending, dict):
        for k, v in pending.items():
            if v in _consent_by_id and _consent_by_id[v].status == "PENDING":
                _pending_by_digits[str(k)] = str(v)
    audit = raw.get("audit") or []
    for item in audit[-MAX_AUDIT:]:
        try:
            _audit.append(
                MessageLogEntry(
                    id=str(item["id"]),
                    direction=item["direction"],
                    to_addr=str(item["to_addr"]),
                    from_addr=str(item["from_addr"]),
                    body_preview=str(item["body_preview"]),
                    timestamp=_parse_dt(str(item["timestamp"])),
                    consent_request_id=item.get("consent_request_id"),
                    twilio_message_sid=item.get("twilio_message_sid"),
                )
            )
        except (KeyError, TypeError, ValueError):
            continue


_load_snapshot()


def _audit(
    direction: MsgDirection,
    to_addr: str,
    from_addr: str,
    body: str,
    *,
    consent_request_id: str | None = None,
    twilio_message_sid: str | None = None,
) -> None:
    preview = (body or "").replace("\n", " ")[:400]
    _audit.append(
        MessageLogEntry(
            id=str(uuid.uuid4()),
            direction=direction,
            to_addr=to_addr,
            from_addr=from_addr,
            body_preview=preview,
            timestamp=_utcnow(),
            consent_request_id=consent_request_id,
            twilio_message_sid=twilio_message_sid,
        )
    )


def _persist() -> None:
    try:
        _persist_snapshot()
    except OSError:
        pass


def _twilio_client() -> Client:
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    if not sid or not token:
        raise HTTPException(
            status_code=503,
            detail="Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).",
        )
    return Client(sid, token)


def _twilio_from() -> str:
    wfrom = (os.getenv("TWILIO_WHATSAPP_FROM") or os.getenv("TWILIO_WHATSAPP_NUMBER") or "").strip()
    if not wfrom:
        raise HTTPException(
            status_code=503,
            detail="TWILIO_WHATSAPP_FROM (or TWILIO_WHATSAPP_NUMBER) is not set (e.g. whatsapp:+14155238886 for sandbox).",
        )
    return wfrom if wfrom.lower().startswith("whatsapp:") else f"whatsapp:{wfrom}"


def _webhook_public_url() -> str:
    u = (os.getenv("TWILIO_WEBHOOK_PUBLIC_URL") or os.getenv("WEBHOOK_URL") or "").strip()
    if not u:
        raise HTTPException(
            status_code=503,
            detail="TWILIO_WEBHOOK_PUBLIC_URL or WEBHOOK_URL must be set to the exact public URL of POST /api/whatsapp/webhook.",
        )
    return u.rstrip("/")


def _validate_twilio_signature(request: Request, form_dict: dict[str, Any]) -> None:
    if os.getenv("TWILIO_SKIP_SIGNATURE_VALIDATION", "").strip() in ("1", "true", "yes"):
        return
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=503, detail="Twilio auth token missing.")
    url = _webhook_public_url()
    sig = request.headers.get("X-Twilio-Signature") or ""
    if not RequestValidator(token).validate(url, form_dict, sig):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature.")


def _expire_stale_locked() -> None:
    now = _utcnow()
    for req in list(_consent_by_id.values()):
        if now - req.created_at > CONSENT_TTL and req.status == "PENDING":
            req.status = "EXPIRED"
            req.updated_at = now
            req.last_error = "Consent window expired."
            d = _digits_only(req.phone_e164)
            if _pending_by_digits.get(d) == req.id:
                del _pending_by_digits[d]


class SendConsentBody(BaseModel):
    phone: str = Field(..., description="User-entered phone; normalized to India E.164 +91…")
    reportText: str = Field(..., min_length=20, max_length=MAX_REPORT_CHARS)


class SendConsentResponse(BaseModel):
    requestId: str
    status: Literal["PENDING"]
    phoneNumber: str | None = None
    messageSid: str | None = None


class ConsentStatusResponse(BaseModel):
    status: ConsentStatus
    updatedAt: str
    error: str | None = None
    phoneNumber: str | None = None
    messageSid: str | None = None


class AuditLogItem(BaseModel):
    id: str
    direction: MsgDirection
    to_addr: str
    from_addr: str
    body: str
    timestamp: str
    consent_request_id: str | None = None
    twilio_message_sid: str | None = None


class AuditLogResponse(BaseModel):
    request_id: str
    entries: list[AuditLogItem]


@router.post("/send-consent", response_model=SendConsentResponse)
async def send_consent(body: SendConsentBody) -> SendConsentResponse:
    e164 = normalize_to_e164_india(body.phone)
    if not e164:
        raise HTTPException(
            status_code=400,
            detail="Invalid phone: use India E.164 (+91XXXXXXXXXX) or 10 digits starting 6–9.",
        )

    report = (body.reportText or "").strip()
    if len(report) < 20:
        raise HTTPException(status_code=400, detail="reportText is too short.")

    async with _lock:
        _expire_stale_locked()
        dkey = _digits_only(e164)
        if dkey in _pending_by_digits:
            existing_id = _pending_by_digits[dkey]
            existing = _consent_by_id.get(existing_id)
            if existing and existing.status == "PENDING":
                raise HTTPException(
                    status_code=409,
                    detail="A pending consent already exists for this number. Wait or use SMS/copy instead.",
                )

        rid = str(uuid.uuid4())
        req = ConsentRequest(id=rid, phone_e164=e164, status="PENDING", report_text=report[:MAX_REPORT_CHARS])
        _consent_by_id[rid] = req
        _pending_by_digits[dkey] = rid
        _persist()

    to_wa = wa_address(e164)
    wfrom = ""
    consent_sid: str | None = None
    try:
        client = _twilio_client()
        wfrom = _twilio_from()
        msg = await asyncio.to_thread(
            lambda: client.messages.create(from_=wfrom, to=to_wa, body=CONSENT_MESSAGE)
        )
        consent_sid = msg.sid
        async with _lock:
            if rid in _consent_by_id:
                _consent_by_id[rid].consent_message_sid = msg.sid
                _consent_by_id[rid].updated_at = _utcnow()
                _persist()
        _audit(
            "OUTBOUND",
            to_addr=to_wa,
            from_addr=wfrom,
            body=CONSENT_MESSAGE,
            consent_request_id=rid,
            twilio_message_sid=msg.sid,
        )
        async with _lock:
            _persist()
    except HTTPException:
        async with _lock:
            _consent_by_id.pop(rid, None)
            _pending_by_digits.pop(dkey, None)
            _persist()
        raise
    except Exception as e:  # noqa: BLE001
        async with _lock:
            if rid in _consent_by_id:
                _consent_by_id[rid].status = "FAILED"
                _consent_by_id[rid].last_error = str(e)
                _consent_by_id[rid].updated_at = _utcnow()
            _pending_by_digits.pop(dkey, None)
            _persist()
        _audit(
            "OUTBOUND",
            to_addr=to_wa,
            from_addr=wfrom or "(unconfigured)",
            body=f"[FAILED] {CONSENT_MESSAGE}",
            consent_request_id=rid,
        )
        async with _lock:
            _persist()
        raise HTTPException(status_code=502, detail=f"Twilio send failed: {e}") from e

    req_for_return = _consent_by_id.get(rid)
    return SendConsentResponse(
        requestId=rid,
        status="PENDING",
        phoneNumber=(req_for_return.phone_e164 if req_for_return else e164),
        messageSid=consent_sid,
    )


@router.get("/consent-status", response_model=ConsentStatusResponse)
async def consent_status(request_id: str) -> ConsentStatusResponse:
    async with _lock:
        _expire_stale_locked()
        req = _consent_by_id.get(request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Unknown requestId.")
        return ConsentStatusResponse(
            status=req.status,
            updatedAt=req.updated_at.isoformat(),
            error=req.last_error,
            phoneNumber=req.phone_e164,
            messageSid=req.consent_message_sid,
        )


@router.get("/audit-logs", response_model=AuditLogResponse)
async def audit_logs(request_id: str) -> AuditLogResponse:
    async with _lock:
        if request_id not in _consent_by_id:
            raise HTTPException(status_code=404, detail="Unknown requestId.")
        items = [
            AuditLogItem(
                id=a.id,
                direction=a.direction,
                to_addr=a.to_addr,
                from_addr=a.from_addr,
                body=a.body_preview,
                timestamp=a.timestamp.isoformat(),
                consent_request_id=a.consent_request_id,
                twilio_message_sid=a.twilio_message_sid,
            )
            for a in _audit
            if a.consent_request_id == request_id
        ]
    return AuditLogResponse(request_id=request_id, entries=items)


@router.post("/webhook")
async def twilio_webhook(request: Request) -> dict[str, str]:
    form = await request.form()
    form_dict: dict[str, Any] = {k: v for k, v in form.items()}

    _validate_twilio_signature(request, form_dict)

    from_raw = str(form_dict.get("From") or "")
    to_raw = str(form_dict.get("To") or "")
    body = str(form_dict.get("Body") or "")
    inbound_sid = str(form_dict.get("MessageSid") or "")

    user_e164 = parse_twilio_whatsapp_from(from_raw)
    if not user_e164:
        return {"ok": "1"}

    dkey = _digits_only(user_e164)
    _audit(
        "INBOUND",
        to_addr=to_raw,
        from_addr=from_raw,
        body=body,
        twilio_message_sid=inbound_sid or None,
    )
    async with _lock:
        _persist()

    async with _lock:
        _expire_stale_locked()
        rid = _pending_by_digits.get(dkey)
        if not rid:
            async with _lock:
                _persist()
            return {"ok": "1"}
        req = _consent_by_id.get(rid)
        if not req or req.status != "PENDING":
            _persist()
            return {"ok": "1"}

        if _is_no(body):
            req.status = "DECLINED"
            req.updated_at = _utcnow()
            req.last_error = "User declined (NO)."
            _pending_by_digits.pop(dkey, None)
            _persist()
            return {"ok": "1"}

        if not _is_yes(body):
            _persist()
            return {"ok": "1"}

        req.status = "CONSENTED"
        req.updated_at = _utcnow()
        phone_copy = req.phone_e164
        report_copy = req.report_text
        rid_copy = rid
        _pending_by_digits.pop(dkey, None)
        _persist()

    try:
        client = _twilio_client()
        wfrom = _twilio_from()
        to_wa = wa_address(phone_copy)
        report_body = report_copy
        if len(report_body) > 3500:
            report_body = report_body[:3490] + "\n\n[…truncated by VITALIS for WhatsApp]"

        msg = await asyncio.to_thread(
            lambda: client.messages.create(from_=wfrom, to=to_wa, body=report_body)
        )
        async with _lock:
            r2 = _consent_by_id.get(rid_copy)
            if r2:
                r2.status = "REPORT_SENT"
                r2.report_message_sid = msg.sid
                r2.updated_at = _utcnow()
                _pending_by_digits.pop(_digits_only(phone_copy), None)
                _persist()
        _audit(
            "OUTBOUND",
            to_addr=to_wa,
            from_addr=wfrom,
            body=report_body[:500] + ("…" if len(report_body) > 500 else ""),
            consent_request_id=rid_copy,
            twilio_message_sid=msg.sid,
        )
        async with _lock:
            _persist()
    except Exception as e:  # noqa: BLE001
        async with _lock:
            r2 = _consent_by_id.get(rid_copy)
            if r2:
                r2.status = "FAILED"
                r2.last_error = str(e)
                r2.updated_at = _utcnow()
            _pending_by_digits.pop(_digits_only(phone_copy), None)
            _persist()
        try:
            wfrom_err = _twilio_from()
        except HTTPException:
            wfrom_err = "(unconfigured)"
        _audit(
            "OUTBOUND",
            to_addr=wa_address(phone_copy),
            from_addr=wfrom_err,
            body=f"[REPORT SEND FAILED] {e}",
            consent_request_id=rid_copy,
        )
        async with _lock:
            _persist()

    return {"ok": "1"}
