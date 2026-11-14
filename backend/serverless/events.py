"""Lambda Function URL events (payload format 2.0), as CloudFront-fronted requests arrive."""

from typing import Any

DOMAIN = "example.lambda-url.us-east-1.on.aws"


def function_url_event(
    method: str,
    path: str,
    query: str = "",
    body: str | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    """A minimal but complete Function URL event for `method path?query`."""
    all_headers = {"host": DOMAIN, "x-forwarded-proto": "https", "x-forwarded-port": "443"}
    if body is not None:
        all_headers["content-type"] = "application/json"
    all_headers.update({name.lower(): value for name, value in (headers or {}).items()})
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": query,
        "headers": all_headers,
        "requestContext": {
            "accountId": "anonymous",
            "apiId": "example",
            "domainName": DOMAIN,
            "domainPrefix": "example",
            "http": {
                "method": method,
                "path": path,
                "protocol": "HTTP/1.1",
                "sourceIp": "192.0.2.1",  # a CloudFront edge address, not the visitor's
                "userAgent": "Amazon CloudFront",
            },
            "requestId": "local-request",
            "routeKey": "$default",
            "stage": "$default",
            "time": "14/Nov/2026:00:00:00 +0000",
            "timeEpoch": 1_794_528_000_000,
        },
        "body": body,
        "isBase64Encoded": False,
    }
