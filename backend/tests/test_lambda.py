"""The Lambda entry point: API keys from SSM Parameter Store, and Function URL events.

SSM is mocked in-process with moto: no AWS account or credentials are involved.
"""

import json

import boto3
import pytest
from moto import mock_aws

from cloud_secrets import PLACEHOLDER, SecretsUnavailable, load_ssm_secrets
from serverless.events import function_url_event

REGION = "us-east-1"


@pytest.fixture
def ssm(monkeypatch):
    # Fake credentials so botocore never looks for real ones
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)
    with mock_aws():
        yield boto3.client("ssm", region_name=REGION)


def put(ssm, name: str, value: str) -> None:
    ssm.put_parameter(Name=name, Value=value, Type="SecureString")


def test_loads_each_configured_key_into_the_environment(ssm):
    put(ssm, "/app/groq", "groq-secret")
    put(ssm, "/app/gemini", "gemini-secret")
    env = {"GROQ_API_KEY_PARAM": "/app/groq", "GEMINI_API_KEY_PARAM": "/app/gemini"}

    loaded = load_ssm_secrets(env)

    assert sorted(loaded) == ["GEMINI_API_KEY", "GROQ_API_KEY"]
    assert env["GROQ_API_KEY"] == "groq-secret"
    assert env["GEMINI_API_KEY"] == "gemini-secret"


def test_without_parameter_names_no_client_is_created():
    def no_client():
        raise AssertionError("SSM must not be called")

    env: dict[str, str] = {}

    assert load_ssm_secrets(env, client_factory=no_client) == []
    assert env == {}


def test_a_placeholder_value_leaves_the_key_unset(ssm):
    # Terraform creates the parameters with a placeholder; until the owner sets a real key the
    # demo keeps answering the example questions offline instead of sending a bogus key
    put(ssm, "/app/groq", PLACEHOLDER)
    put(ssm, "/app/gemini", "gemini-secret")
    env = {"GROQ_API_KEY_PARAM": "/app/groq", "GEMINI_API_KEY_PARAM": "/app/gemini"}

    assert load_ssm_secrets(env) == ["GEMINI_API_KEY"]
    assert "GROQ_API_KEY" not in env


def test_a_missing_parameter_fails_the_cold_start(ssm):
    # A typo in a parameter name must be loud, not a silent fall back to the offline demo
    env = {"GROQ_API_KEY_PARAM": "/app/does-not-exist"}

    with pytest.raises(SecretsUnavailable, match="/app/does-not-exist"):
        load_ssm_secrets(env)


def test_the_handler_answers_a_function_url_event():
    import lambda_handler

    response = lambda_handler.handler(function_url_event("GET", "/api/health"), None)

    assert response["statusCode"] == 200
    assert json.loads(response["body"])["status"] == "healthy"


def test_the_handler_passes_the_request_body():
    import lambda_handler

    response = lambda_handler.handler(
        function_url_event("POST", "/api/ask", body=json.dumps({"question": "x"})), None
    )

    # Too short: rejected by validation, which proves the JSON body reached FastAPI
    assert response["statusCode"] == 422


def test_a_placeholder_key_is_reported_by_name_only(ssm, caplog):
    put(ssm, "/app/groq", PLACEHOLDER)
    env = {"GROQ_API_KEY_PARAM": "/app/groq"}

    with caplog.at_level("WARNING"):
        load_ssm_secrets(env)

    assert "GROQ_API_KEY" in caplog.text and "/app/groq" in caplog.text
    assert PLACEHOLDER not in caplog.text
