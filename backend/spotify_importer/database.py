from __future__ import annotations

from contextlib import contextmanager

import psycopg

from config import DATABASE_URL


@contextmanager
def get_connection():
    """
    Context-managed PostgreSQL connection.

    Automatically commits on success and rolls back on failure.
    """

    conn = psycopg.connect(DATABASE_URL)

    try:
        yield conn
        conn.commit()

    except Exception:
        conn.rollback()
        raise

    finally:
        conn.close()
