import os
import sys

# Ensure root workspace is on Python path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.fastf1_service import app

# Vercel serverless entry point
__all__ = ["app"]
