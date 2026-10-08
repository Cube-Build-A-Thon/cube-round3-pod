"""Multi-tenant security enforcement, photo boundary checks, and canonical ID formatting.
Enforces S1, D1, and C1 requirements for Prep Manager.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple


class PrepSecurityError(Exception):
    """Raised when tenant isolation or security boundaries are breached."""
    pass


class TenantGuard:
    """Enforces multi-tenant isolation at the agent boundary (S1 Fix)."""

    @staticmethod
    def verify_tenant(request: Dict[str, Any], allowed_org_ids: Optional[List[str]] = None) -> str:
        """Validates that the request belongs to an authorized organization context.
        
        Raises LookupError (HTTP 404 / AgentRejected) if tenant is invalid or missing.
        """
        subject = request.get("subject", {})
        org_id = subject.get("org_id")
        subject_id = subject.get("subject_id")

        if not org_id or not subject_id:
            raise LookupError("Missing required 'org_id' or 'subject_id' in subject payload.")

        # Default allowed demo orgs in Round 3
        valid_orgs = allowed_org_ids or ["org_demo_alpha", "org_demo_bravo"]
        if org_id not in valid_orgs:
            raise LookupError(f"Unauthorized organization '{org_id}'. Permitted: {valid_orgs}")

        return org_id


class PhotoBoundaryValidator:
    """Guarantees observations do not cite phantom or out-of-bounds photos (D1 Fix)."""

    @staticmethod
    def validate_photo_index(photo_idx: Optional[int], inputs: List[Dict[str, Any]]) -> Tuple[bool, Optional[str]]:
        """Checks if photo_index exists within inputs list.
        
        Returns:
            (is_valid, evidence_ref)
        """
        if photo_idx is None:
            return False, None

        num_photos = len(inputs)
        if num_photos == 0:
            return False, None

        # Convert 1-indexed to 0-indexed
        idx_zero = photo_idx - 1 if isinstance(photo_idx, int) else -1
        if 0 <= idx_zero < num_photos:
            ref = inputs[idx_zero].get("ref")
            return True, ref

        return False, None


def generate_canonical_prep_id(subject_id: str) -> str:
    """Generates canonical PRP- prefixed record identifier (C1 Fix).
    
    Transforms 'UNIT-0014' -> 'PRP-0014' or 'PRP-UNIT-0014'.
    Conforms strictly to regex: ^(RCV|PRP|PCK|RTN|RCY)-[A-Za-z0-9._-]+$
    """
    clean_subj = re.sub(r"[^A-Za-z0-9._-]", "", subject_id)
    if clean_subj.startswith("UNIT-"):
        clean_subj = clean_subj.replace("UNIT-", "")
    return f"PRP-{clean_subj}"
