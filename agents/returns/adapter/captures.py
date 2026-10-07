from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from shared.utils.stubs import previous


class CaptureError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class ResolvedCaptures:
    reference_url: str
    reference_ref: str
    reference_source: str  # "pack" | "receiving" | "own_capture"
    return_urls: list[str]
    return_refs: list[str]
    inputs: list[dict[str, Any]]
    alias_map: dict[str, str]  # model alias (e.g. photo_1, ref_photo) -> actual capture ref


def _verify_and_hash(ref: str, input_dir: Path, expected_sha: str | None = None) -> tuple[Path, str]:
    """Resolves ref safely under input_dir with path traversal protection and returns (path, sha256)."""
    # Reject leading slashes or suspicious traversal sequences upfront
    if ref.startswith("/") or ref.startswith("\\") or ".." in ref:
        resolved = (input_dir / ref).resolve()
        if not resolved.is_relative_to(input_dir.resolve()):
            raise CaptureError("path_traversal", f"ref {ref!r} escapes input directory")
    else:
        resolved = (input_dir / ref).resolve()
        if not resolved.is_relative_to(input_dir.resolve()):
            raise CaptureError("path_traversal", f"ref {ref!r} escapes input directory")

    if not resolved.is_file():
        raise CaptureError("file_not_found", f"capture file not found: {ref}")

    content = resolved.read_bytes()
    computed_sha = hashlib.sha256(content).hexdigest()

    if expected_sha and computed_sha != expected_sha:
        raise CaptureError("input_hash_mismatch", f"sha256 mismatch for {ref}: expected {expected_sha}, got {computed_sha}")

    return resolved, computed_sha


def resolve_captures(request: dict, input_dir: Path) -> ResolvedCaptures:
    """Discovers, validates, and partitions captures into reference and return photos (§4.2)."""
    inputs_meta = request.get("inputs", [])
    subject_id = request["subject"]["subject_id"]

    # If no inputs passed in request, discover from disk
    if not inputs_meta:
        unit_folder = input_dir / subject_id / "returns"
        if unit_folder.is_dir():
            for p in sorted(unit_folder.iterdir()):
                if p.is_file() and not p.name.startswith("."):
                    rel = p.relative_to(input_dir).as_posix()
                    inputs_meta.append({"ref": rel, "sha256": None, "kind": "image"})

    verified_inputs: list[dict[str, Any]] = []
    own_ref_photos: list[tuple[str, str]] = []  # (ref, sha256)
    own_return_photos: list[tuple[str, str]] = []  # (ref, sha256)

    for item in inputs_meta:
        ref = item["ref"]
        expected_sha = item.get("sha256")
        _, sha = _verify_and_hash(ref, input_dir, expected_sha)
        verified_inputs.append({"ref": ref, "sha256": sha, "kind": "image"})

        filename = Path(ref).name.lower()
        if filename.startswith("ref_") or "reference" in filename:
            own_ref_photos.append((ref, sha))
        else:
            own_return_photos.append((ref, sha))

    # Reference photo precedence (§4.2)
    reference_ref: str | None = None
    reference_source: str = "own_capture"

    # Precedence 1: Image input on latest Pack record
    pack_rec = previous(request, "pack")
    if pack_rec and pack_rec.get("inputs"):
        for inp in pack_rec["inputs"]:
            if inp.get("kind") == "image":
                try:
                    _verify_and_hash(inp["ref"], input_dir, inp.get("sha256"))
                    reference_ref = inp["ref"]
                    reference_source = "pack"
                    break
                except CaptureError:
                    pass

    # Precedence 2: Image input on latest Receiving record
    if not reference_ref:
        rcv_rec = previous(request, "receiving")
        if rcv_rec and rcv_rec.get("inputs"):
            for inp in rcv_rec["inputs"]:
                if inp.get("kind") == "image":
                    try:
                        _verify_and_hash(inp["ref"], input_dir, inp.get("sha256"))
                        reference_ref = inp["ref"]
                        reference_source = "receiving"
                        break
                    except CaptureError:
                        pass

    # Precedence 3: Own ref_* photo
    if not reference_ref and own_ref_photos:
        reference_ref = own_ref_photos[0][0]
        reference_source = "own_capture"

    if not reference_ref:
        raise CaptureError("no_reference_photo", "no reference photo available from upstream or captures")

    if not own_return_photos:
        raise CaptureError("no_return_photo", "no return photos available for inspection")

    alias_map: dict[str, str] = {"ref_photo": reference_ref}
    return_urls: list[str] = []
    return_refs: list[str] = []

    for idx, (ref, _) in enumerate(own_return_photos, start=1):
        alias = f"photo_{idx}"
        alias_map[alias] = ref
        return_urls.append(f"http://capture.local/{ref}")
        return_refs.append(ref)

    reference_url = f"http://capture.local/{reference_ref}"

    return ResolvedCaptures(
        reference_url=reference_url,
        reference_ref=reference_ref,
        reference_source=reference_source,
        return_urls=return_urls,
        return_refs=return_refs,
        inputs=verified_inputs,
        alias_map=alias_map,
    )
