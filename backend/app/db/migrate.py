"""Apply SQL migrations to a Postgres/Supabase database, in filename order.

Usage:
    export DATABASE_URL="postgresql://postgres:<pw>@<host>:5432/postgres"
    uv run python -m backend.app.db.migrate

DATABASE_URL is the Supabase Postgres connection string (Project settings →
Database → Connection string → URI). This is separate from SUPABASE_SERVICE_KEY,
which the app uses for row inserts via the REST client.

Migrations are idempotent (IF NOT EXISTS), so re-running is safe. If you'd rather
not install psycopg, paste backend/app/db/schema.sql into the Supabase SQL Editor
instead — it's the same statements concatenated.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


def migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def split_statements(sql: str) -> list[str]:
    """Split a DDL file into individual statements.

    psycopg3's extended protocol runs one statement per execute(), so we split
    on top-level semicolons. `--` comments are stripped to end-of-line first
    (these migrations never use `--` inside string literals), which also avoids
    apostrophes in comments corrupting quote tracking. Semicolons inside single
    quotes are respected.
    """
    no_comments = []
    for line in sql.splitlines():
        idx = line.find("--")
        no_comments.append(line if idx == -1 else line[:idx])
    text = "\n".join(no_comments)

    statements: list[str] = []
    buf: list[str] = []
    in_str = False
    for ch in text:
        if ch == "'":
            in_str = not in_str
        if ch == ";" and not in_str:
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
        else:
            buf.append(ch)
    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)
    return statements


def main() -> int:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        print("ERROR: set DATABASE_URL to your Supabase Postgres connection string.")
        print("  (Project settings → Database → Connection string → URI)")
        return 2

    try:
        import psycopg  # optional dep; see pyproject [ops] extra
    except ImportError:
        print("ERROR: psycopg not installed. Either:")
        print("  • uv sync --extra ops   (then re-run), or")
        print("  • paste backend/app/db/schema.sql into the Supabase SQL Editor.")
        return 3

    files = migration_files()
    if not files:
        print("No migration files found.")
        return 1

    with psycopg.connect(dsn, autocommit=True) as conn:
        for f in files:
            statements = split_statements(f.read_text())
            print(f"Applying {f.name} ({len(statements)} statements) ...", end=" ")
            for stmt in statements:
                conn.execute(stmt)
            print("ok")

    print(f"Done — applied {len(files)} migration(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
