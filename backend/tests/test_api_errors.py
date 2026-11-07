"""Health endpoints and error handling. No database needed: services are patched."""

import pytest
from fastapi.testclient import TestClient

import main
from services import MarketService


@pytest.fixture
def client() -> TestClient:
    # raise_server_exceptions=False lets the 500 handler produce the response
    return TestClient(main.app, raise_server_exceptions=False)


def test_health_reports_version(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "version": main.settings.APP_VERSION}


def test_value_error_returns_400_json(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    def boom() -> None:
        raise ValueError("Unknown collection 'nope'")

    monkeypatch.setattr(MarketService, "get_stats", staticmethod(boom))

    response = client.get("/api/market/stats")

    assert response.status_code == 400
    assert response.json() == {"detail": "Unknown collection 'nope'"}


def test_unexpected_error_returns_500_without_details(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom() -> None:
        raise RuntimeError("connection string with secrets")

    monkeypatch.setattr(MarketService, "get_stats", staticmethod(boom))

    response = client.get("/api/market/stats")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "secrets" not in response.text


def test_cors_allows_only_configured_origins(client: TestClient) -> None:
    allowed = main.settings.CORS_ORIGINS[0]

    ok = client.get("/health", headers={"Origin": allowed})
    denied = client.get("/health", headers={"Origin": "https://evil.example"})

    assert ok.headers.get("access-control-allow-origin") == allowed
    assert "access-control-allow-origin" not in denied.headers
    assert "access-control-allow-credentials" not in ok.headers
