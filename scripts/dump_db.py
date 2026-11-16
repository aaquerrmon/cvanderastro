# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "psycopg[binary]>=3.2",
#   "pgvector>=0.3",
#   "numpy>=1.26",
#   "python-dotenv>=1.0",
# ]
# ///
"""Vuelca cada tabla de PostgreSQL (AgentePersonal) a un JSON por tabla en src/data/db/.

Uso: uv run scripts/dump_db.py   (requiere el contenedor postgres levantado)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from dotenv import dotenv_values
from pgvector.psycopg import register_vector
from psycopg import connect
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[1]  # cvanderastro/
AGENTE = ROOT.parent / "AgentePersonal"
OUT_DIR = ROOT / "src" / "data" / "db"


def get_connection():
    env = dotenv_values(AGENTE / ".env")
    return connect(
        # El .env usa "postgres" (nombre de red Docker); desde el host es localhost
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(env.get("POSTGRES_PORT", "5432")),
        dbname=env.get("POSTGRES_DB", "mydatabase"),
        user=env.get("POSTGRES_USER", "admin"),
        password=env.get("POSTGRES_PASSWORD", ""),
        connect_timeout=5,
        row_factory=dict_row,
    )


def json_default(obj):
    """VECTOR(384) -> lista de floats; fechas -> ISO."""
    for attr in ("to_list", "tolist"):  # pgvector.Vector usa to_list, numpy tolist
        if hasattr(obj, attr):
            return getattr(obj, attr)()
    return str(obj)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        conn = get_connection()
    except Exception as exc:
        print(f"No se pudo conectar a PostgreSQL en localhost: {exc}", file=sys.stderr)
        print(
            "¿Está levantado? -> cd AgentePersonal && docker compose up -d postgres",
            file=sys.stderr,
        )
        return 1

    with conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                "SELECT tablename FROM pg_tables "
                "WHERE schemaname = 'public' ORDER BY tablename"
            )
            tablas = [row["tablename"] for row in cur.fetchall()]

            if not tablas:
                print("No hay tablas en el esquema public.", file=sys.stderr)
                return 1

            for tabla in tablas:
                if tabla.startswith("checkpoint"):
                    continue  # estado interno de LangGraph, no interesa al cliente
                cur.execute(f'SELECT * FROM "{tabla}" ORDER BY 1')
                filas = cur.fetchall()
                path = OUT_DIR / f"{tabla}.json"
                path.write_text(
                    json.dumps(
                        filas, ensure_ascii=False, indent=2, default=json_default
                    ),
                    encoding="utf-8",
                )
                kb = path.stat().st_size / 1024
                print(f"{tabla}: {len(filas)} filas -> src/data/db/{tabla}.json ({kb:.1f} KB)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
