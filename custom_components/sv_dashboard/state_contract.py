"""Small Home Assistant state-shape helpers without HA runtime imports."""

from __future__ import annotations

from hashlib import sha256
from typing import Any

MAX_HA_STATE_LENGTH = 255


def bounded_state_identifier(value: Any, *, prefix: str = "id") -> str | None:
    """Return a stable identifier that always fits Home Assistant's state limit.

    Keep existing short identifiers unchanged for backwards compatibility.
    Only identifiers that exceed Home Assistant's 255-character state limit
    are replaced by a deterministic digest. The original identifier remains
    available in entity attributes/canonical storage.
    """
    if value is None:
        return None
    text = str(value)
    if len(text) <= MAX_HA_STATE_LENGTH:
        return text
    digest = sha256(text.encode("utf-8")).hexdigest()[:24]
    return f"{prefix}:{digest}"
