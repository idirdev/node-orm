# node-orm

[![TypeScript](https://img.shields.io/badge/TypeScript-4.5-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)

A lightweight, decorator-based ORM for Node.js with TypeScript. Zero runtime dependencies -- just TypeScript decorators, a fluent query builder, and a migration system.

## Features

- **Decorator-based models** -- `@Entity`, `@Field`, `@PrimaryKey`, `@HasMany`, `@BelongsTo`
- **Fluent query builder** -- chainable API for SELECT, WHERE, JOIN, GROUP BY, aggregations
- **Migration system** -- create tables, add/remove columns, track versions
- **Schema generation** -- auto-generate CREATE TABLE SQL from decorated classes
- **Transaction support** -- atomic operations with automatic rollback
- **Database agnostic** -- pluggable executor supports any SQL database

## Installation

```bash
npm install node-orm reflect-metadata
```

Add to your `tsconfig.json`:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Quick Start — SQLite (zero config)

The easiest way to get started is with the built-in SQLite adapter. Install the
optional peer dependency:

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3   # if using TypeScript
```

Then connect and use the ORM immediately — no server required:

```typescript
import 'reflect-metadata';
import { Entity, Field, PrimaryKey, AutoIncrement, Model, Connection, Schema, FieldType } from 'node-orm';

@Entity('users')
class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Field({ type: FieldType.INTEGER })
  id!: number;

  @Field({ type: FieldType.STRING })
  name!: string;

  @Field({ type: FieldType.STRING })
  email!: string;
}

async function main() {
  // Opens (or creates) users.db and wires up the SQLite executor automatically.
  // Pass ':memory:' for a temporary in-memory database.
  const db = await Connection.sqlite('./users.db');

  // Create the table from the decorated model class.
  db.exec(Schema.generateCreateSQL(User));

  // Create
  const user = await User.create({ name: 'Alice', email: 'alice@example.com' });
  console.log(user.id); // auto-incremented id

  // Read
  const found = await User.find(user.id);
  const all   = await User.findAll({ limit: 10 });

  // Update
  await User.update(user.id, { name: 'Alice Smith' });

  // Delete
  await User.delete(user.id);

  await Connection.disconnect();
}

main();
```

Alternatively, use the named export directly:

```typescript
import { createSQLiteConnection } from 'node-orm';

const db = await createSQLiteConnection('./myapp.db', /* logging= */ true);
```

## Quick Start — other databases (bring your own driver)

```typescript
import 'reflect-metadata';
import { Entity, Field, PrimaryKey, AutoIncrement, Model, Connection, FieldType } from 'node-orm';

@Entity('users')
class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Field({ type: FieldType.INTEGER })
  id!: number;

  @Field({ type: FieldType.STRING })
  name!: string;

  @Field({ type: FieldType.STRING })
  email!: string;
}

async function main() {
  await Connection.connect({ dialect: 'postgres', database: 'myapp' });

  // Create
  const user = await User.create({ name: 'Alice', email: 'alice@example.com' });

  // Read
  const found = await User.find(1);
  const all = await User.findAll({ limit: 10 });

  // Update
  await User.update(1, { name: 'Alice Smith' });

  // Delete
  await User.delete(1);
}
```

## Decorator Reference

| Decorator | Target | Description |
|-----------|--------|-------------|
| `@Entity(tableName)` | Class | Maps class to a database table |
| `@Field(config)` | Property | Defines a column with type and options |
| `@PrimaryKey` | Property | Marks column as primary key |
| `@AutoIncrement` | Property | Auto-increment integer column |
| `@Nullable` | Property | Column allows NULL values |
| `@Unique` | Property | Adds UNIQUE constraint |
| `@Default(value)` | Property | Sets default value |
| `@HasMany(target, fk)` | Property | One-to-many relation |
| `@BelongsTo(target, fk)` | Property | Many-to-one relation |

## Query Builder

```typescript
import { QueryBuilder } from 'node-orm';

// Simple query
const { sql, params } = QueryBuilder.table('users')
  .select('id', 'name', 'email')
  .where('status', '=', 'active')
  .andWhere('age', '>=', 18)
  .orderBy('name', 'ASC')
  .limit(10)
  .offset(20)
  .toSQL();

// JOIN
QueryBuilder.table('posts')
  .select('posts.*', 'users.name AS author')
  .join('users', 'posts.user_id', 'users.id', 'LEFT')
  .where('posts.published', '=', true)
  .toSQL();

// Aggregation
QueryBuilder.table('orders')
  .select('user_id')
  .sum('amount')
  .groupBy('user_id')
  .having('SUM(amount)', '>', 100)
  .toSQL();

// Execute directly
const users = await QueryBuilder.table('users')
  .where('active', '=', true)
  .execute();
```

## Migrations

```typescript
import { Migration, MigrationRunner, FieldType } from 'node-orm';

class CreateUsersTable extends Migration {
  up() {
    this.createTable('users', (t) => {
      t.id();
      t.column('name', FieldType.STRING, { nullable: false });
      t.column('email', FieldType.STRING, { unique: true });
      t.timestamps();
    });
  }

  down() {
    this.dropTable('users');
  }
}

class AddAgeColumn extends Migration {
  up() {
    this.addColumn('users', 'age', FieldType.INTEGER, { nullable: true });
    this.addIndex('users', ['email'], { unique: true });
  }

  down() {
    this.removeColumn('users', 'age');
    this.dropIndex('idx_users_email');
  }
}

// Run migrations
const runner = new MigrationRunner();
runner.register('001_create_users', new CreateUsersTable());
runner.register('002_add_age', new AddAgeColumn());
await runner.up();

// Rollback last migration
await runner.down(1);
```

## Schema Generation

```typescript
import { Schema } from 'node-orm';

// Generate CREATE TABLE SQL from a decorated class
const sql = Schema.generateCreateSQL(User);
console.log(sql);
// CREATE TABLE IF NOT EXISTS users (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//   name VARCHAR(255) NOT NULL,
//   email VARCHAR(255) NOT NULL UNIQUE
// )

// Get structured table definition
const definition = Schema.define(User);
console.log(definition.columns);
```

## Custom Database Driver (bring your own executor)

`Connection.execute()` dispatches every SQL statement through a single
`ExecuteFn` callback. If you're not using the built-in SQLite adapter, you must
register your own executor before calling any model methods.

```typescript
import { Connection } from 'node-orm';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

await Connection.connect({ dialect: 'postgres', database: 'myapp' });

// Wire up the pg driver.  The function receives the SQL string and a
// positional-parameter array; it must return Promise<unknown[]>.
Connection.setExecutor(async (sql, params = []) => {
  const result = await pool.query(sql, params);
  return result.rows;
});

// All Model and QueryBuilder calls now go through the pg pool.
const users = await User.findAll({ limit: 10 });
```

The same pattern works with `mysql2`, `@planetscale/database`, `libsql`, or any
other SQL client — you just wrap its query method in the `ExecuteFn` signature
`(sql: string, params?: unknown[]) => Promise<unknown[]>`.

## Transactions

```typescript
await Connection.transaction(async (tx) => {
  await tx.execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
  await tx.execute('INSERT INTO profiles (user_id) VALUES (?)', [1]);
  // Auto-commits on success, rolls back on error
});
```

## License

MIT

## Roadmap

- [ ] Connection pooling
- [ ] Eager loading
- [ ] Soft deletes

---

## 🇫🇷 Documentation en français

### Description
node-orm est un ORM léger basé sur les décorateurs pour Node.js avec TypeScript, sans dépendances runtime. Il offre un query builder fluide, un système de migrations et un mapping objet-relationnel via des décorateurs TypeScript. Une alternative minimaliste aux ORM lourds pour les projets nécessitant contrôle et transparence.

### Installation
```bash
npm install node-orm reflect-metadata
```

### Utilisation
```typescript
import { Entity, Column, PrimaryKey } from 'node-orm';

@Entity('users')
class User {
  @PrimaryKey() id: number;
  @Column() name: string;
}
```
Consultez la documentation en anglais ci-dessus pour les décorateurs disponibles, le query builder et les migrations.
