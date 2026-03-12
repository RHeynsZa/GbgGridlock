#!/usr/bin/env python3
"""
Database migration runner for Railway deployment.
Runs all SQL migration files in the db/deploy directory in order.
"""
import asyncio
import os
import sys
from pathlib import Path

import asyncpg


async def run_migrations() -> None:
    """Run all migration files in db/deploy directory."""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not set", file=sys.stderr)
        sys.exit(1)

    # Find migrations directory
    repo_root = Path(__file__).parent.parent
    migrations_dir = repo_root / "db" / "deploy"
    
    if not migrations_dir.exists():
        print(f"ERROR: Migrations directory not found: {migrations_dir}", file=sys.stderr)
        sys.exit(1)

    # Get all SQL files sorted by name
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    if not migration_files:
        print("WARNING: No migration files found", file=sys.stderr)
        return

    print(f"Found {len(migration_files)} migration file(s)")
    
    # Connect to database
    try:
        conn = await asyncpg.connect(database_url)
        print("Connected to database successfully")
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        # Run each migration
        for migration_file in migration_files:
            print(f"Running migration: {migration_file.name}")
            
            sql = migration_file.read_text()
            
            try:
                await conn.execute(sql)
                print(f"✓ Successfully applied: {migration_file.name}")
            except Exception as e:
                print(f"ERROR: Migration {migration_file.name} failed: {e}", file=sys.stderr)
                sys.exit(1)
        
        print("\n✓ All migrations completed successfully")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migrations())
