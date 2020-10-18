/**
 * Built-in SQLite adapter using better-sqlite3.
 *
 * This driver is optional — better-sqlite3 must be installed:
 *   npm install better-sqlite3
 *
 * Usage:
 *   import { createSQLiteConnection } from 'node-orm/drivers/sqlite';
 *   await createSQLiteConnection('./my.db');
 *
 * Or via the factory helper on Connection:
 *   await Connection.sqlite('./my.db');
 */

import { Connection } from '../Connection';

/**
 * Open a SQLite database file and wire it up as the active Connection executor.
 *
 * @param filePath  Path to the SQLite database file, or ':memory:' for an
 *                  in-memory database.
 * @param logging   When true, Connection will print every SQL statement to stdout.
 * @returns         The underlying better-sqlite3 Database instance, in case the
 *                  caller needs direct access (e.g. for pragmas or migrations).
 */
export async function createSQLiteConnection(
  filePath: string,
  logging = false
): Promise<import('better-sqlite3').Database> {
  // Dynamic import so that missing better-sqlite3 gives a clear error only when
  // this function is actually called, not at module load time.
  let Database: typeof import('better-sqlite3');
  try {
    Database = (await import('better-sqlite3')).default as unknown as typeof import('better-sqlite3');
  } catch {
    throw new Error(
      'better-sqlite3 is not installed. Run: npm install better-sqlite3'
    );
  }

  const db = new (Database as any)(filePath) as import('better-sqlite3').Database;

  // Tell the ORM about our connection settings.
  await Connection.connect({ dialect: 'sqlite', database: filePath, logging });

  // Register the executor: better-sqlite3 is synchronous, so we wrap it in a
  // resolved promise to satisfy the async ExecuteFn interface.
  Connection.setExecutor(async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
    // better-sqlite3 uses ? placeholders — same as the ORM's query builder.
    const stmt = db.prepare(sql);

    // Detect the statement type from the first non-whitespace keyword.
    const verb = sql.trimStart().substring(0, 6).toUpperCase();

    if (verb === 'SELECT' || verb === 'PRAGMA') {
      return stmt.all(...params) as unknown[];
    }

    // For INSERT … RETURNING / UPDATE … RETURNING (SQLite 3.35+) we must use .all().
    const hasReturning = /\bRETURNING\b/i.test(sql);
    if (hasReturning) {
      return stmt.all(...params) as unknown[];
    }

    // For INSERT / UPDATE / DELETE without RETURNING, run() and synthesise a
    // minimal result so callers that check result.length still work.
    const info = stmt.run(...params);
    if (verb === 'INSERT' && info.lastInsertRowid) {
      // Fetch the newly-created row so Model.create() can return a hydrated instance.
      const table = extractTableName(sql);
      if (table) {
        const row = db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`).get(info.lastInsertRowid);
        return row ? [row as unknown] : [];
      }
    }
    return info.changes > 0 ? [{ changes: info.changes }] : [];
  });

  return db;
}

/** Extract the table name from a simple INSERT / UPDATE / DELETE statement. */
function extractTableName(sql: string): string | null {
  const m = sql.match(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+["'`]?(\w+)["'`]?/i);
  return m ? m[1] : null;
}
