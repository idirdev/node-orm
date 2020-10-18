/**
 * Integration tests for the built-in SQLite adapter.
 *
 * These tests run against a real in-memory SQLite database so they verify
 * end-to-end behaviour: Connection.sqlite() → Schema.generateCreateSQL() →
 * Model.create() / find() / findAll() / update() / delete() / count().
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Connection } from '../src/Connection';
import { Model } from '../src/Model';
import { Schema } from '../src/Schema';
import { Entity, Field, PrimaryKey, AutoIncrement, Nullable } from '../src/decorators';
import { FieldType } from '../src/types';
import { QueryBuilder } from '../src/QueryBuilder';
import type { Database } from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Model definition used throughout the tests
// ---------------------------------------------------------------------------

@Entity('products')
class Product extends Model {
  @PrimaryKey
  @AutoIncrement
  @Field({ type: FieldType.INTEGER })
  id!: number;

  @Field({ type: FieldType.STRING })
  name!: string;

  @Nullable
  @Field({ type: FieldType.FLOAT })
  price!: number | null;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

let db: Database;

beforeAll(async () => {
  // Reset static Connection state between test suites (other tests may have
  // called Connection.connect without an executor).
  (Connection as any).isConnected = false;
  (Connection as any).executeFn = null;

  db = await Connection.sqlite(':memory:');

  // Create the table using the ORM's schema generator.
  const ddl = Schema.generateCreateSQL(Product);
  // better-sqlite3 executes multiple statements via db.exec()
  db.exec(ddl);
});

afterAll(async () => {
  await Connection.disconnect();
});

describe('Connection.sqlite()', () => {
  it('connects and returns a Database instance', () => {
    expect(db).toBeDefined();
    expect(typeof db.prepare).toBe('function');
  });

  it('reports as connected', () => {
    expect(Connection.getConnection().connected).toBe(true);
  });

  it('config reflects sqlite dialect', () => {
    expect(Connection.getConfig()?.dialect).toBe('sqlite');
  });
});

describe('Model CRUD with SQLite', () => {
  it('creates a record and returns the hydrated instance', async () => {
    const p = await Product.create({ name: 'Widget', price: 9.99 });
    expect(p).toBeInstanceOf(Product);
    expect(p.name).toBe('Widget');
    expect(p.id).toBeGreaterThan(0);
  });

  it('finds a record by id', async () => {
    const created = await Product.create({ name: 'Gadget', price: 24.99 });
    const found = await Product.find(created.id);
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Gadget');
  });

  it('returns null for a missing id', async () => {
    const found = await Product.find(99999);
    expect(found).toBeNull();
  });

  it('findAll returns all rows', async () => {
    const all = await Product.findAll();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('findAll supports limit', async () => {
    const limited = await Product.findAll({ limit: 1 });
    expect(limited.length).toBe(1);
  });

  it('count returns the total number of rows', async () => {
    const n = await Product.count();
    expect(n).toBeGreaterThanOrEqual(2);
  });

  it('exists returns true for a present id', async () => {
    const p = await Product.create({ name: 'Probe', price: 1.0 });
    expect(await Product.exists(p.id)).toBe(true);
  });

  it('exists returns false for a missing id', async () => {
    expect(await Product.exists(99998)).toBe(false);
  });

  it('delete removes a record', async () => {
    const p = await Product.create({ name: 'ToDelete', price: 0 });
    await Product.delete(p.id);
    const found = await Product.find(p.id);
    expect(found).toBeNull();
  });
});

describe('QueryBuilder with SQLite', () => {
  it('executes a SELECT with a WHERE clause', async () => {
    await Product.create({ name: 'Alpha', price: 5 });
    const rows = await QueryBuilder.table('products')
      .where('name', '=', 'Alpha')
      .execute<{ name: string }>();
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].name).toBe('Alpha');
  });

  it('executes COUNT aggregation', async () => {
    const rows = await QueryBuilder.table('products').count().execute<{ count: number }>();
    expect(rows[0].count).toBeGreaterThan(0);
  });
});

describe('createSQLiteConnection (named export)', () => {
  it('is re-exported from index', async () => {
    const { createSQLiteConnection } = await import('../src/index');
    expect(typeof createSQLiteConnection).toBe('function');
  });
});
