import sys
from pathlib import Path

# The backend modules are flat (main.py, services.py...), so make them importable from tests/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
