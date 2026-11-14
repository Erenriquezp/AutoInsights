"""API keys for the hosted models, read from SSM Parameter Store when running on Lambda.

Terraform creates one SecureString parameter per key and passes its name in `<KEY>_PARAM`
(for example GROQ_API_KEY_PARAM). At cold start the values are copied into the environment,
where `ask.providers.get_provider` reads them, so the keys never appear in the Lambda
configuration or in the Terraform state. Locally no `*_PARAM` is set and nothing happens.
"""

import logging
from collections.abc import Callable, MutableMapping
from typing import Any

logger = logging.getLogger(__name__)

SECRET_NAMES = ("GROQ_API_KEY", "GEMINI_API_KEY")
# Value Terraform writes when it creates a parameter; the owner replaces it with the real key
PLACEHOLDER = "not-set"


class SecretsUnavailable(RuntimeError):
    """A configured parameter could not be read: fail the cold start instead of running keyless."""


def _ssm_client() -> Any:
    import boto3  # provided by the Lambda runtime; imported only when parameters are configured

    return boto3.client("ssm")


def load_ssm_secrets(
    env: MutableMapping[str, str], client_factory: Callable[[], Any] = _ssm_client
) -> list[str]:
    """Copy each configured key from SSM into `env`. Returns the names that were set."""
    params = {name: env[f"{name}_PARAM"] for name in SECRET_NAMES if env.get(f"{name}_PARAM")}
    if not params:
        return []

    reply = client_factory().get_parameters(Names=list(params.values()), WithDecryption=True)
    if reply.get("InvalidParameters"):
        raise SecretsUnavailable(
            f"SSM parameters not found: {', '.join(reply['InvalidParameters'])}"
        )
    values = {item["Name"]: item["Value"] for item in reply["Parameters"]}

    loaded = []
    for name, param in params.items():
        if values[param] == PLACEHOLDER:
            # Names only, never values: explains in the logs why the demo answers offline
            logger.warning("%s is not set yet: put the key in SSM parameter %s", name, param)
            continue
        env[name] = values[param]
        loaded.append(name)
    return loaded
