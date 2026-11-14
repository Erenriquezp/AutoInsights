"""AWS Lambda entry point: the same FastAPI app, with Function URL events adapted by Mangum.

The gold tables ship inside the package (GOLD_PATH defaults to ./data/gold) and API keys come
from SSM before the app is imported, so the providers see them when they are built.
"""

import os

from cloud_secrets import load_ssm_secrets

load_ssm_secrets(os.environ)

from mangum import Mangum  # noqa: E402

from main import app  # noqa: E402

# No lifespan events: the app has no startup hooks, and Lambda has no clean shutdown to run them
handler = Mangum(app, lifespan="off")
