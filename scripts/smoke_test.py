"""End-to-end smoke test: POST a submission to a running backend and report.

Run the backend first (with Supabase env set):
    uv run uvicorn backend.app.main:app --port 8000

Then, in another shell:
    uv run python scripts/smoke_test.py            # hits http://localhost:8000
    uv run python scripts/smoke_test.py https://your-api.example.com

Exits 0 on a 201 with a submission_id. This confirms the full path:
browser → backend → validation → Supabase insert. Check the Supabase table
editor afterwards to see the row.
"""

from __future__ import annotations

import json
import sys
import urllib.request

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000"

payload = {
    "type": "drill",
    "contributor": {"name": "Smoke Test", "consent_to_credit": True},
    "fields": {"name": "smoke-test drill", "setup": "set up cones"},
    "raw_freeform": "This row was created by scripts/smoke_test.py.",
}


def post(path: str, body: dict) -> tuple[int, str]:
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode()
    except urllib.error.HTTPError as e:  # type: ignore[attr-defined]
        return e.code, e.read().decode()


def main() -> int:
    # Health first.
    try:
        with urllib.request.urlopen(f"{BASE}/health") as r:
            print(f"/health -> {r.status} {r.read().decode()}")
    except Exception as e:
        print(f"Backend not reachable at {BASE}: {e}")
        return 1

    status, body = post("/api/submissions", payload)
    print(f"POST /api/submissions -> {status} {body}")
    if status == 201:
        print("✅ End-to-end OK. Check the Supabase 'submissions' table for the row.")
        return 0
    print("❌ Unexpected status. If it's 201 you're good; otherwise see the detail above.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
