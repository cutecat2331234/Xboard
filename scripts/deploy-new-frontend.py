#!/usr/bin/env python3
"""Deprecated alias — use deploy-original-frontend.py."""
import subprocess
import sys
from pathlib import Path

if __name__ == "__main__":
    target = Path(__file__).with_name("deploy-original-frontend.py")
    print("deploy-new-frontend.py is deprecated; running deploy-original-frontend.py", file=sys.stderr)
    raise SystemExit(subprocess.call([sys.executable, str(target)]))
