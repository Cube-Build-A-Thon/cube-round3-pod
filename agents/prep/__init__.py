"""Prep Manager Agent Package."""

import sys
from pathlib import Path

_agent_dir = Path(__file__).resolve().parent
_pkg_root = _agent_dir.parent
if str(_pkg_root) not in sys.path:
    sys.path.insert(0, str(_pkg_root))
