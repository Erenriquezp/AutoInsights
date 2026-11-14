"""Smoke test of the built package inside the official Lambda runtime image.

    python -m serverless.build                                  # from backend/
    docker compose --profile lambda up -d lambda-api            # from the repo root
    python -m serverless.smoke                                  # from backend/

The container runs the Lambda Runtime Interface Emulator. Each check sends the Function URL
event CloudFront would forward and inspects what the handler returns. Exits 1 on any failure.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from serverless.events import function_url_event

INVOKE_PATH = "/2015-03-31/functions/function/invocations"
VIEWER = "cloudfront-viewer-address"


class Lambda:
    def __init__(self, url: str) -> None:
        self.url = url.rstrip("/") + INVOKE_PATH

    def call(self, method: str, path: str, **kwargs: Any) -> tuple[int, Any]:
        event = function_url_event(method, path, **kwargs)
        request = urllib.request.Request(
            self.url, data=json.dumps(event).encode(), headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(request, timeout=300) as reply:
            raw = reply.read()
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            raise AssertionError(f"{method} {path}: not a Lambda result: {raw[:300]!r}") from None
        if "statusCode" not in result:
            raise AssertionError(f"{method} {path}: the function failed: {result}")
        return result["statusCode"], json.loads(result["body"]) if result.get("body") else None

    def wait_until_ready(self, seconds: int = 30) -> None:
        """The emulator accepts connections a few seconds after the container starts."""
        for _ in range(seconds):
            try:
                urllib.request.urlopen(self.url.replace(INVOKE_PATH, "/"), timeout=2)
            except urllib.error.HTTPError:
                return  # it answered: the emulator is up
            except OSError:
                time.sleep(1)
            else:
                return
        raise AssertionError(f"Nothing answers on {self.url}: is lambda-api running?")


def ask(fn: Lambda, question: str, viewer: str) -> tuple[int, Any]:
    body = json.dumps({"question": question})
    return fn.call("POST", "/api/ask", body=body, headers={VIEWER: f"{viewer}:443"})


def run(fn: Lambda) -> None:
    fn.wait_until_ready()
    status, body = fn.call("GET", "/api/health")
    check(status == 200 and body["status"] == "healthy", "health", status, body)

    status, body = fn.call("GET", "/api/market/stats")
    check(status == 200 and body.get("total_vehicles", 0) > 0, "market stats", status, body)

    status, brands = fn.call("GET", "/api/brands")
    check(status == 200 and brands, "brands", status, brands)
    status, models = fn.call("GET", f"/api/models/{brands[0]}")
    check(status == 200 and models, "models", status, models)

    query = urllib.parse.urlencode({"brand": brands[0], "model": models[0]})
    status, body = fn.call("GET", "/api/vehicles/depreciation", query=query)
    check(status == 200 and body, f"depreciation of {brands[0]} {models[0]}", status, body)

    # API errors stay JSON: CloudFront must not turn them into the SPA's index.html
    query = urllib.parse.urlencode({"brand": "nope", "model": "nope"})
    status, body = fn.call("GET", "/api/vehicles/depreciation", query=query)
    check(status == 404 and "detail" in body, "unknown model is a JSON 404", status, body)

    status, examples = fn.call("GET", "/api/ask/examples")
    check(status == 200 and examples, "ask examples", status, examples)
    status, body = ask(fn, examples[0], "198.51.100.10")
    check(status == 200 and body["sql"] and body["rows"], "ask an example", status, body)

    # The per-visitor limit follows the address CloudFront reports, not the edge's address
    statuses = [ask(fn, examples[0], "198.51.100.10")[0] for _ in range(6)]
    check(429 in statuses, "same viewer is rate limited", statuses, None)
    status, body = ask(fn, examples[0], "203.0.113.7")
    check(status == 200, "another viewer is not", status, body)


def check(ok: Any, name: str, status: Any, body: Any) -> None:
    if not ok:
        raise AssertionError(f"{name}: got {status} {str(body)[:300]}")
    print(f"ok  {name}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--url", default="http://127.0.0.1:9000")
    try:
        run(Lambda(parser.parse_args().url))
    except (AssertionError, OSError) as error:
        print(f"FAIL {error}", file=sys.stderr)
        sys.exit(1)
    print("Lambda smoke test passed.")


if __name__ == "__main__":
    main()
