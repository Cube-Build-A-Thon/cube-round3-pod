"""Tenancy Isolation Layer (Engineering Rule 1: Tenancy isolation before any feature)."""

import hashlib
from contextvars import ContextVar
from pathlib import Path
from agents.prep.config import settings

# Thread/async-safe context variable holding the currently authenticated tenant
current_org_context: ContextVar[str] = ContextVar("current_org_context", default="org_demo_alpha")


class TenancySecurityError(PermissionError):
    """Raised when cross-tenant data access or key guessing is attempted."""
    pass


def get_current_org() -> str:
    """Retrieve the active tenant organization ID."""
    return current_org_context.get()


def set_current_org(org_id: str) -> None:
    """Set the active tenant organization ID."""
    if org_id not in settings.allowed_orgs:
        raise TenancySecurityError(f"Invalid or unauthorized organization: '{org_id}'")
    current_org_context.set(org_id)


def generate_tenant_image_path(org_id: str, image_bytes: bytes, filename_hint: str = "capture.jpg") -> Path:
    """Generate an unguessable SHA-256 hashed path strictly scoped under the tenant namespace."""
    content_hash = hashlib.sha256(image_bytes).hexdigest()
    tenant_dir = settings.storage_dir / org_id
    tenant_dir.mkdir(parents=True, exist_ok=True)
    return tenant_dir / f"{content_hash}.jpg"


def get_tenant_image_bytes(org_id: str, photo_ref: str) -> bytes:
    """Retrieve image bytes ensuring the requesting tenant strictly owns the path."""
    requested_path = Path(photo_ref).resolve()
    expected_tenant_dir = (settings.storage_dir / org_id).resolve()

    # Guard against directory traversal and cross-tenant key guessing
    if not str(requested_path).startswith(str(expected_tenant_dir)):
        raise TenancySecurityError(
            f"Tenant Security Violation: '{org_id}' attempted to access unauthorized path '{photo_ref}'"
        )

    if not requested_path.exists():
        raise FileNotFoundError(f"Image not found for tenant '{org_id}'")

    return requested_path.read_bytes()


def verify_tenancy_isolation(repo) -> dict[str, bool]:
    """Automated verification test ensuring org_demo_alpha sees ZERO rows from org_demo_bravo."""
    set_current_org("org_demo_alpha")
    alpha_records = repo.list_records()
    alpha_sees_bravo = any(r.org_id == "org_demo_bravo" for r in alpha_records)

    set_current_org("org_demo_bravo")
    bravo_records = repo.list_records()
    bravo_sees_alpha = any(r.org_id == "org_demo_alpha" for r in bravo_records)

    return {
        "alpha_isolated": not alpha_sees_bravo,
        "bravo_isolated": not bravo_sees_alpha,
        "isolation_verified": (not alpha_sees_bravo) and (not bravo_sees_alpha)
    }
